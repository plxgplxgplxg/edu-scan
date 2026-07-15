import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'node:path';
import { PrismaService } from '../../../database/prisma.service';
import { AssignmentsRepository } from '../repositories/assignments.repository';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import { GradeStatus, SubmitStatus } from '@prisma/client';
import {
  IStorageService,
  StoredFileMetadata,
} from '../../../storage/storage.interface';
import {
  ASSIGNMENT_INSTRUCTION_EXTENSIONS,
  ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES,
  ASSIGNMENT_INSTRUCTION_MIME_TYPES,
  ASSIGNMENT_SUBMISSION_EXTENSIONS,
  ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES,
  ASSIGNMENT_SUBMISSION_MIME_TYPES,
} from '../assignment-file-policy';
import {
  NotificationsService,
  NOTIFICATIONS_QUEUE_NAME,
  JOB_ASSIGNMENT_DUE_SOON,
  JOB_ASSIGNMENT_OVERDUE,
  JOB_TEACHER_ASSIGNMENT_SUMMARY,
} from '../../notifications/services/notifications.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly prisma: PrismaService,
    @Inject(IStorageService)
    private readonly storageService: IStorageService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(NOTIFICATIONS_QUEUE_NAME)
    private readonly notificationsQueue: Queue,
  ) {}

  async createAssignment(
    teacherId: string,
    dto: CreateAssignmentDto,
    instructionFile?: Express.Multer.File,
  ) {
    const deadline = new Date(dto.deadline);

    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be a future date.');
    }

    const allowLate = dto.allowLate ?? false;
    const latePenaltyPct = allowLate ? (dto.latePenaltyPct ?? 0) : 0;
    if (latePenaltyPct < 0 || latePenaltyPct > 100) {
      throw new BadRequestException(
        'Late penalty percentage must be between 0 and 100.',
      );
    }

    const ownedClass = await this.prisma.class.findFirst({
      where: { teacherId, id: dto.classId },
      select: { id: true },
    });

    if (!ownedClass) {
      throw new ForbiddenException('Class does not belong to this teacher.');
    }

    const uploadedInstruction = instructionFile
      ? await this.uploadAssignmentFile({
          file: instructionFile,
          folder: `eduscan/assignments/instructions/${dto.classId}`,
          allowedMimeTypes: ASSIGNMENT_INSTRUCTION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_INSTRUCTION_EXTENSIONS,
          maxBytes: ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported instruction file type.',
          tooLargeMessage:
            'Instruction file exceeds the configured size limit.',
        })
      : null;

    let assignment: Awaited<ReturnType<AssignmentsRepository['create']>>;
    try {
      assignment = await this.assignmentsRepository.create({
        title: dto.title,
        description: dto.description,
        deadline,
        allowLate,
        latePenaltyPct,
        maxScore: dto.maxScore ?? 10,
        teacherId,
        classId: dto.classId,
        ...this.toInstructionFileRecord(uploadedInstruction),
      });
    } catch (error) {
      if (uploadedInstruction?.publicId) {
        await this.storageService.deleteFile(uploadedInstruction.publicId);
      }
      throw error;
    }

    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { classId: dto.classId },
      select: { studentId: true },
    });

    await this.notificationsService.createAssignmentCreatedNotifications({
      assignmentId: assignment.id,
      classId: dto.classId,
      title: assignment.title,
      deadline: assignment.deadline,
      students: enrollments.map((enrollment) => ({ id: enrollment.studentId })),
    });

    const nowTime = Date.now();
    const deadlineTime = deadline.getTime();
    const msToDeadline = deadlineTime - nowTime;
    const msToDueSoon = Math.max(0, msToDeadline - 24 * 60 * 60 * 1000);

    await this.notificationsQueue.add(
      JOB_ASSIGNMENT_DUE_SOON,
      { assignmentId: assignment.id },
      {
        delay: msToDueSoon,
        jobId: `due-soon:${assignment.id}`,
        removeOnComplete: true,
      },
    );

    await this.notificationsQueue.add(
      JOB_ASSIGNMENT_OVERDUE,
      { assignmentId: assignment.id },
      {
        delay: Math.max(0, msToDeadline),
        jobId: `overdue:${assignment.id}`,
        removeOnComplete: true,
      },
    );

    await this.notificationsQueue.add(
      JOB_TEACHER_ASSIGNMENT_SUMMARY,
      { assignmentId: assignment.id },
      {
        delay: Math.max(0, msToDeadline),
        jobId: `summary:${assignment.id}`,
        removeOnComplete: true,
      },
    );

    return assignment;
  }

  async listAssignmentsForTeacher(teacherId: string) {
    return this.assignmentsRepository.findAllByTeacher(teacherId);
  }

  async listAssignmentsForStudent(studentId: string) {
    return this.assignmentsRepository.findAllByStudent(studentId);
  }

  async submitAssignment(
    assignmentId: string,
    studentId: string,
    dto: SubmitAssignmentDto,
    file?: Express.Multer.File,
  ) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, classId: assignment.classId },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in the class assigned to this assignment.',
      );
    }

    const now = new Date();
    const isLate = now > assignment.deadline;

    if (isLate && !assignment.allowLate) {
      throw new BadRequestException(
        'Deadline has passed and late submissions are not allowed.',
      );
    }

    const existingSubmit =
      await this.assignmentsRepository.findSubmitByStudentAndAssignment(
        assignmentId,
        studentId,
      );

    const submitStatus = isLate ? SubmitStatus.LATE : SubmitStatus.ON_TIME;
    const note = dto.note?.trim() || null;

    if (!note && !file) {
      throw new BadRequestException(
        'Submission requires either a note or an uploaded file.',
      );
    }

    if (existingSubmit && existingSubmit.gradeStatus !== GradeStatus.PENDING) {
      throw new BadRequestException(
        'This submission can no longer be updated.',
      );
    }

    const uploadedSubmission = file
      ? await this.uploadAssignmentFile({
          file,
          folder: `eduscan/assignments/${assignmentId}/submissions/${studentId}`,
          allowedMimeTypes: ASSIGNMENT_SUBMISSION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_SUBMISSION_EXTENSIONS,
          maxBytes: ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported submission file type.',
          tooLargeMessage: 'Submission file exceeds the configured size limit.',
        })
      : null;

    const submitData = {
      note,
      ...this.toSubmitFileRecord(uploadedSubmission),
      submitStatus,
      gradeStatus: GradeStatus.PENDING,
    };

    try {
      if (existingSubmit) {
        const updatedSubmit = await this.assignmentsRepository.updateSubmit(
          existingSubmit.id,
          assignmentId,
          submitData,
        );
        if (uploadedSubmission?.publicId && existingSubmit.filePublicId) {
          await this.storageService.deleteFile(existingSubmit.filePublicId);
        }
        return updatedSubmit;
      }

      return await this.assignmentsRepository.createSubmit({
        assignmentId,
        studentId,
        ...submitData,
      });
    } catch (error) {
      if (uploadedSubmission?.publicId) {
        await this.storageService.deleteFile(uploadedSubmission.publicId);
      }
      throw error;
    }
  }

  async getSubmitsForTeacher(assignmentId: string, teacherId: string) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to view submissions for this assignment.',
      );
    }
    return this.assignmentsRepository.findSubmitsByAssignment(assignmentId);
  }

  async getMySubmit(assignmentId: string, studentId: string) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, classId: assignment.classId },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in the class assigned to this assignment.',
      );
    }

    return this.assignmentsRepository.findSubmitByStudentAndAssignment(
      assignmentId,
      studentId,
    );
  }

  async gradeSubmit(
    assignmentId: string,
    submitId: string,
    teacherId: string,
    dto: GradeSubmitDto,
  ) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to grade submissions for this assignment.',
      );
    }

    if (dto.score < 0) {
      throw new BadRequestException('Score must be a non-negative number.');
    }
    if (dto.score > assignment.maxScore) {
      throw new BadRequestException(
        `Score cannot exceed the maximum score of ${assignment.maxScore}.`,
      );
    }

    return this.assignmentsRepository.updateSubmit(submitId, assignmentId, {
      score: dto.score,
      feedback: dto.feedback,
      gradeStatus: GradeStatus.GRADED,
    });
  }

  private async uploadAssignmentFile(input: {
    file: Express.Multer.File;
    folder: string;
    allowedMimeTypes: Set<string>;
    allowedExtensions: Set<string>;
    maxBytes: number;
    unsupportedTypeMessage: string;
    tooLargeMessage: string;
  }) {
    if (!input.allowedMimeTypes.has(input.file.mimetype)) {
      throw new BadRequestException(input.unsupportedTypeMessage);
    }

    const extension = extname(input.file.originalname).toLowerCase();
    if (!input.allowedExtensions.has(extension)) {
      throw new BadRequestException('Unsupported file extension.');
    }

    if (input.file.size > input.maxBytes) {
      throw new BadRequestException(input.tooLargeMessage);
    }

    return this.storageService.uploadDocument(input.file, input.folder);
  }

  private toInstructionFileRecord(file: StoredFileMetadata | null) {
    if (!file) {
      return {};
    }

    return {
      instructionFileUrl: file.url,
      instructionFilePublicId: file.publicId,
      instructionFileOriginalName: file.originalName,
      instructionFileMimeType: file.mimeType,
      instructionFileSizeBytes: file.sizeBytes,
      instructionFileUploadedAt: file.uploadedAt,
    };
  }

  private toSubmitFileRecord(file: StoredFileMetadata | null) {
    if (!file) {
      return {};
    }

    return {
      fileUrl: file.url,
      filePublicId: file.publicId,
      fileOriginalName: file.originalName,
      fileMimeType: file.mimeType,
      fileSizeBytes: file.sizeBytes,
      fileUploadedAt: file.uploadedAt,
    };
  }

  async deleteAssignment(assignmentId: string, teacherId: string) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to delete this assignment.',
      );
    }
    return this.assignmentsRepository.delete(assignmentId);
  }
}
