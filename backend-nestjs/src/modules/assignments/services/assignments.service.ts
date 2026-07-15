import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'node:path';
import { PrismaService } from '../../../database/prisma.service';
import { AssignmentsRepository } from '../repositories/assignments.repository';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { UpdateAssignmentDto } from '../dtos/update-assignment.dto';
import { UpdateSubmitDto } from '../dtos/update-submit.dto';
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
    instructionFiles?: Express.Multer.File[],
  ) {
    const deadline = new Date(dto.deadline);
    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be a future date.');
    }

    const allowLate = dto.allowLate ?? false;
    const latePenaltyPct = dto.latePenaltyPct ?? 0;

    const classRecord = await this.prisma.class.findFirst({
      where: { teacherId, id: dto.classId },
      select: { id: true, name: true },
    });

    if (!classRecord) {
      throw new ForbiddenException('Class does not belong to this teacher.');
    }

    const uploadedInstructions = instructionFiles?.length
      ? await this.uploadAssignmentFiles({
          files: instructionFiles,
          folder: `eduscan/assignments/instructions/${dto.classId}`,
          allowedMimeTypes: ASSIGNMENT_INSTRUCTION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_INSTRUCTION_EXTENSIONS,
          maxBytes: ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported instruction file type.',
          tooLargeMessage: 'Instruction file exceeds the configured size limit.',
        })
      : [];

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
        attachments: dto.attachments ? [...dto.attachments, ...uploadedInstructions] : uploadedInstructions,
      });
    } catch (error) {
      for (const file of uploadedInstructions) {
        if (file.publicId) await this.storageService.deleteFile(file.publicId);
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

  async updateAssignment(
    assignmentId: string,
    teacherId: string,
    dto: UpdateAssignmentDto,
    instructionFiles?: Express.Multer.File[],
  ) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to edit this assignment.',
      );
    }

    if (dto.deadline) {
      const deadline = new Date(dto.deadline);
      if (deadline <= new Date()) {
        throw new BadRequestException('Deadline must be a future date.');
      }
    }

    if (dto.latePenaltyPct !== undefined) {
      if (dto.latePenaltyPct < 0 || dto.latePenaltyPct > 100) {
        throw new BadRequestException(
          'Late penalty percentage must be between 0 and 100.',
        );
      }
    }

    let uploadedInstructions: any[] = [];
    if (instructionFiles && instructionFiles.length > 0) {
      uploadedInstructions = await this.uploadAssignmentFiles({
          files: instructionFiles,
          folder: `eduscan/assignments/instructions/${assignment.classId}`,
          allowedMimeTypes: ASSIGNMENT_INSTRUCTION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_INSTRUCTION_EXTENSIONS,
          maxBytes: ASSIGNMENT_INSTRUCTION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported instruction file type.',
          tooLargeMessage: 'Instruction file exceeds the configured size limit.',
      });
    }

    const dataToUpdate: any = { ...dto };
    if (dto.deadline) {
      dataToUpdate.deadline = new Date(dto.deadline);
    }
    
    let finalAttachments: any[] = [];
    if (dto.attachments) {
      finalAttachments = [...dto.attachments];
    } else if (assignment.attachments) {
      finalAttachments = assignment.attachments as any[];
    }
    if (uploadedInstructions.length > 0) {
      finalAttachments = [...finalAttachments, ...uploadedInstructions];
    }
    
    const oldAttachments = (assignment.attachments as any[]) || [];
    const retainedPublicIds = new Set(finalAttachments.map(a => a.publicId).filter(Boolean));
    for (const old of oldAttachments) {
      if (old.publicId && !retainedPublicIds.has(old.publicId)) {
        this.storageService.deleteFile(old.publicId).catch(console.error);
      }
    }

    dataToUpdate.attachments = finalAttachments;

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: dataToUpdate,
    });
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
    files?: Express.Multer.File[],
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

    if (!note && (!files || files.length === 0) && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException(
        'Submission requires either a note or uploaded files.',
      );
    }

    if (existingSubmit && existingSubmit.gradeStatus !== GradeStatus.PENDING) {
      throw new BadRequestException(
        'This submission can no longer be updated.',
      );
    }

    const uploadedSubmissions = files?.length
      ? await this.uploadAssignmentFiles({
          files,
          folder: `eduscan/assignments/${assignmentId}/submissions/${studentId}`,
          allowedMimeTypes: ASSIGNMENT_SUBMISSION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_SUBMISSION_EXTENSIONS,
          maxBytes: ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported submission file type.',
          tooLargeMessage: 'Submission file exceeds the configured size limit.',
        })
      : [];
      
    const finalAttachments = dto.attachments ? [...dto.attachments, ...uploadedSubmissions] : uploadedSubmissions;

    const submitData = {
      note,
      attachments: finalAttachments,
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
        const oldAttachments = (existingSubmit.attachments as any[]) || [];
        const retainedIds = new Set(finalAttachments.map(a => a.publicId).filter(Boolean));
        for (const old of oldAttachments) {
           if (old.publicId && !retainedIds.has(old.publicId)) {
             this.storageService.deleteFile(old.publicId).catch(console.error);
           }
        }
        return updatedSubmit;
      }

      return await this.assignmentsRepository.createSubmit({
        assignmentId,
        studentId,
        ...submitData,
      });
    } catch (error) {
      for (const file of uploadedSubmissions) {
        if (file.publicId) await this.storageService.deleteFile(file.publicId);
      }
      throw error;
    }
  }

  async updateStudentSubmit(
    assignmentId: string,
    studentId: string,
    dto: UpdateSubmitDto,
    files?: Express.Multer.File[],
  ) {
    const existingSubmit =
      await this.assignmentsRepository.findSubmitByStudentAndAssignment(
        assignmentId,
        studentId,
      );

    if (!existingSubmit) {
      throw new NotFoundException('Submission not found.');
    }

    if (existingSubmit.gradeStatus !== GradeStatus.PENDING) {
      throw new BadRequestException(
        'This submission has already been graded and cannot be updated.',
      );
    }

    const dataToUpdate: any = { ...dto };
    
    let uploadedSubmissions: any[] = [];
    if (files && files.length > 0) {
      uploadedSubmissions = await this.uploadAssignmentFiles({
          files,
          folder: `eduscan/assignments/${assignmentId}/submissions/${studentId}`,
          allowedMimeTypes: ASSIGNMENT_SUBMISSION_MIME_TYPES,
          allowedExtensions: ASSIGNMENT_SUBMISSION_EXTENSIONS,
          maxBytes: ASSIGNMENT_SUBMISSION_MAX_FILE_BYTES,
          unsupportedTypeMessage: 'Unsupported submission file type.',
          tooLargeMessage: 'Submission file exceeds the configured size limit.',
      });
    }

    let finalAttachments: any[] = [];
    if (dto.attachments) {
      finalAttachments = [...dto.attachments];
    } else if (existingSubmit.attachments) {
      finalAttachments = existingSubmit.attachments as any[];
    }
    if (uploadedSubmissions.length > 0) {
      finalAttachments = [...finalAttachments, ...uploadedSubmissions];
    }

    if (!dataToUpdate.note && finalAttachments.length === 0) {
       throw new BadRequestException(
         'Submission requires either a note or attachments.',
       );
    }
    
    const oldAttachments = (existingSubmit.attachments as any[]) || [];
    const retainedIds = new Set(finalAttachments.map(a => a.publicId).filter(Boolean));
    for (const old of oldAttachments) {
       if (old.publicId && !retainedIds.has(old.publicId)) {
         this.storageService.deleteFile(old.publicId).catch(console.error);
       }
    }
    
    dataToUpdate.attachments = finalAttachments;

    return this.assignmentsRepository.updateSubmit(
      existingSubmit.id,
      assignmentId,
      dataToUpdate,
    );
  }

  async getSubmitsForTeacher(assignmentId: string, teacherId: string, page = 1, limit = 10, keyword?: string) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to view submissions for this assignment.',
      );
    }
    return this.assignmentsRepository.findSubmitsByAssignment(assignmentId, page, limit, keyword);
  }

  async getSubmitForTeacher(assignmentId: string, submitId: string, teacherId: string) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to view this submission.',
      );
    }
    const submit = await this.assignmentsRepository.findSubmitById(submitId);
    if (!submit || submit.assignmentId !== assignmentId) {
      throw new NotFoundException('Submission not found.');
    }
    return submit;
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

    const gradedSubmit = await this.assignmentsRepository.updateSubmit(
      submitId,
      assignmentId,
      {
        score: dto.score,
        feedback: dto.feedback,
        gradeStatus: GradeStatus.GRADED,
      },
    );

    await this.notificationsService.createAssignmentGradedNotification({
      assignmentId: assignment.id,
      classId: assignment.classId,
      title: assignment.title,
      studentId: gradedSubmit.studentId,
    });

    return gradedSubmit;
  }

  private async uploadAssignmentFiles(input: {
    files: Express.Multer.File[];
    folder: string;
    allowedMimeTypes: Set<string>;
    allowedExtensions: Set<string>;
    maxBytes: number;
    unsupportedTypeMessage: string;
    tooLargeMessage: string;
  }) {
    const results: any[] = [];
    for (const file of input.files) {
      if (!input.allowedMimeTypes.has(file.mimetype)) {
        throw new BadRequestException(`${input.unsupportedTypeMessage} (${file.originalname})`);
      }

      const extension = extname(file.originalname).toLowerCase();
      if (!input.allowedExtensions.has(extension)) {
        throw new BadRequestException(`Unsupported file extension: ${extension} for file ${file.originalname}`);
      }

      if (file.size > input.maxBytes) {
        throw new BadRequestException(`${input.tooLargeMessage} (${file.originalname})`);
      }

      const stored = await this.storageService.uploadDocument(file, input.folder);
      results.push({
        url: stored.url,
        publicId: stored.publicId,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        uploadedAt: stored.uploadedAt,
      });
    }
    return results;
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
