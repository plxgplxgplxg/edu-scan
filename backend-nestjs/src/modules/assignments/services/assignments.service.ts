import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AssignmentsRepository } from '../repositories/assignments.repository';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import { GradeStatus, SubmitStatus } from '@prisma/client';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createAssignment(teacherId: string, dto: CreateAssignmentDto) {
    const deadline = new Date(dto.deadline);

    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be a future date.');
    }

    const latePenaltyPct = dto.latePenaltyPct ?? 0;
    if (latePenaltyPct < 0 || latePenaltyPct > 100) {
      throw new BadRequestException(
        'Late penalty percentage must be between 0 and 100.',
      );
    }

    const ownedClasses = await this.prisma.class.findMany({
      where: { teacherId, id: { in: dto.classIds } },
      select: { id: true },
    });

    if (ownedClasses.length !== dto.classIds.length) {
      throw new ForbiddenException(
        'One or more classes do not belong to this teacher.',
      );
    }

    return this.assignmentsRepository.create(
      {
        title: dto.title,
        description: dto.description,
        deadline,
        allowLate: dto.allowLate ?? false,
        latePenaltyPct,
        maxScore: dto.maxScore ?? 10,
        teacherId,
      } as any,
      dto.classIds,
    );
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
  ) {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    const classIds = assignment.classes.map((c) => c.classId);
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, classId: { in: classIds } },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in any class assigned to this assignment.',
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
    if (existingSubmit) {
      throw new BadRequestException(
        'You have already submitted this assignment.',
      );
    }

    const submitStatus = isLate ? SubmitStatus.LATE : SubmitStatus.ON_TIME;

    return this.assignmentsRepository.createSubmit({
      assignmentId,
      studentId,
      fileUrl: dto.fileUrl,
      submitStatus,
      gradeStatus: GradeStatus.PENDING,
    });
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

    const classIds = assignment.classes.map((c) => c.classId);
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { studentId, classId: { in: classIds } },
    });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in any class assigned to this assignment.',
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
}
