import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Process, Processor, InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { OnEvent } from '@nestjs/event-emitter';
import type { CreateNotificationInput } from '../notification.types';
import { PushProviderService } from './push-provider.service';

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';
export const JOB_ASSIGNMENT_DUE_SOON = 'ASSIGNMENT_DUE_SOON';
export const JOB_ASSIGNMENT_OVERDUE = 'ASSIGNMENT_OVERDUE';
export const JOB_TEACHER_ASSIGNMENT_SUMMARY = 'TEACHER_ASSIGNMENT_SUMMARY';
export const JOB_OMR_BATCH_COMPLETED = 'OMR_BATCH_COMPLETED';

export interface AssignmentJobData {
  assignmentId: string;
}

export interface OmrBatchJobData {
  batchId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly pushProviderService: PushProviderService,
    @InjectQueue(NOTIFICATIONS_QUEUE_NAME)
    private readonly notificationsQueue: Queue,
  ) {}

  @OnEvent('omr.batch.completed')
  async handleOmrBatchCompletedEvent(payload: {
    batchId: string;
    status: string;
  }) {
    if (payload.status === 'COMPLETED' || payload.status === 'PARTIAL_FAILED') {
      await this.notificationsQueue.add(
        JOB_OMR_BATCH_COMPLETED,
        { batchId: payload.batchId },
        { jobId: `omr-completed:${payload.batchId}`, removeOnComplete: true },
      );
    }
  }

  async createManyDeduped(items: CreateNotificationInput[]) {
    const result = await this.notificationsRepository.createManyDeduped(items);
    for (const item of items) {
      this.pushProviderService.sendPushNotification(item).catch((err) => {
        Logger.error('Failed to send push notification', err);
      });
    }
    return result;
  }

  async createAssignmentCreatedNotifications(input: {
    assignmentId: string;
    classId: string;
    title: string;
    deadline: Date;
    students: Array<{ id: string }>;
  }) {
    const body = `Hạn nộp ${input.deadline.toISOString()}`;

    return this.createManyDeduped(
      input.students.map((student) => ({
        type: 'ASSIGNMENT_CREATED',
        recipientId: student.id,
        roleTarget: Role.STUDENT,
        entityId: input.assignmentId,
        classId: input.classId,
        assignmentId: input.assignmentId,
        routeIntent: {
          route: 'StudentClassDetail',
          classId: input.classId,
          assignmentId: input.assignmentId,
          mode: 'submit',
        },
        title: input.title,
        body,
        dedupeKey: `assignment-created:${input.assignmentId}:${student.id}`,
      })),
    );
  }

  async createAssignmentGradedNotification(input: {
    assignmentId: string;
    classId: string;
    title: string;
    studentId: string;
  }) {
    return this.createManyDeduped([
      {
        type: 'ASSIGNMENT_GRADED',
        recipientId: input.studentId,
        roleTarget: Role.STUDENT,
        entityId: input.assignmentId,
        classId: input.classId,
        assignmentId: input.assignmentId,
        routeIntent: {
          route: 'StudentClassDetail',
          classId: input.classId,
          assignmentId: input.assignmentId,
          mode: 'readonly',
        },
        title: input.title,
        body: `Bài tập "${input.title}" đã được chấm.`,
        dedupeKey: `assignment-graded:${input.assignmentId}:${input.studentId}`,
      },
    ]);
  }

  listForUser(userId: string) {
    return this.notificationsRepository.listForRecipient(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationsRepository.markAsRead(notificationId, userId);
    return { id: notificationId, read: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepository.markAllAsRead(userId);
    return { updated: result.count };
  }
}

@Processor(NOTIFICATIONS_QUEUE_NAME)
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JOB_ASSIGNMENT_DUE_SOON)
  async handleAssignmentDueSoon(job: Job<AssignmentJobData>) {
    this.logger.log(
      `Processing JOB_ASSIGNMENT_DUE_SOON for assignment ${job.data.assignmentId}`,
    );
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: job.data.assignmentId },
      include: { class: { include: { enrollments: true } } },
    });
    if (!assignment) return;

    // Remind students before deadline
    const studentsWithoutSubmit = await this.getStudentsWithoutSubmit(
      assignment.id,
      assignment.class.enrollments,
    );

    if (studentsWithoutSubmit.length > 0) {
      await this.notificationsService.createManyDeduped(
        studentsWithoutSubmit.map((student) => ({
          type: 'ASSIGNMENT_DUE_SOON',
          recipientId: student.id,
          roleTarget: Role.STUDENT,
          entityId: assignment.id,
          classId: assignment.classId,
          assignmentId: assignment.id,
          routeIntent: {
            route: 'StudentClassDetail',
            classId: assignment.classId,
            assignmentId: assignment.id,
            mode: 'submit',
          },
          title: assignment.title,
          body: `Bài tập sắp đến hạn nộp!`,
          dedupeKey: `assignment-due-soon:${assignment.id}:${student.id}`,
        })),
      );
    }
  }

  @Process(JOB_ASSIGNMENT_OVERDUE)
  async handleAssignmentOverdue(job: Job<AssignmentJobData>) {
    this.logger.log(
      `Processing JOB_ASSIGNMENT_OVERDUE for assignment ${job.data.assignmentId}`,
    );
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: job.data.assignmentId },
      include: { class: { include: { enrollments: true } } },
    });
    if (!assignment) return;

    const studentsWithoutSubmit = await this.getStudentsWithoutSubmit(
      assignment.id,
      assignment.class.enrollments,
    );

    if (studentsWithoutSubmit.length > 0) {
      await this.notificationsService.createManyDeduped(
        studentsWithoutSubmit.map((student) => ({
          type: 'ASSIGNMENT_OVERDUE',
          recipientId: student.id,
          roleTarget: Role.STUDENT,
          entityId: assignment.id,
          classId: assignment.classId,
          assignmentId: assignment.id,
          routeIntent: {
            route: 'StudentClassDetail',
            classId: assignment.classId,
            assignmentId: assignment.id,
            mode: 'submit',
          },
          title: assignment.title,
          body: `Bài tập đã hết hạn!`,
          dedupeKey: `assignment-overdue:${assignment.id}:${student.id}`,
        })),
      );
    }
  }

  @Process(JOB_TEACHER_ASSIGNMENT_SUMMARY)
  async handleTeacherAssignmentSummary(job: Job<AssignmentJobData>) {
    this.logger.log(
      `Processing JOB_TEACHER_ASSIGNMENT_SUMMARY for assignment ${job.data.assignmentId}`,
    );
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: job.data.assignmentId },
      include: { class: { include: { enrollments: true } } },
    });
    if (!assignment) return;

    const studentsWithoutSubmit = await this.getStudentsWithoutSubmit(
      assignment.id,
      assignment.class.enrollments,
    );

    await this.notificationsService.createManyDeduped([
      {
        type: 'TEACHER_ASSIGNMENT_SUMMARY',
        recipientId: assignment.teacherId,
        roleTarget: Role.TEACHER,
        entityId: assignment.id,
        classId: assignment.classId,
        assignmentId: assignment.id,
        routeIntent: {
          route: 'TeacherClassDetail',
          classId: assignment.classId,
        },
        title: `Tổng kết bài tập: ${assignment.title}`,
        body: `Có ${studentsWithoutSubmit.length} học sinh chưa nộp bài.`,
        dedupeKey: `teacher-assignment-summary:${assignment.id}:${assignment.teacherId}`,
      },
    ]);
  }

  @Process(JOB_OMR_BATCH_COMPLETED)
  async handleOmrBatchCompleted(job: Job<OmrBatchJobData>) {
    this.logger.log(
      `Processing JOB_OMR_BATCH_COMPLETED for batch ${job.data.batchId}`,
    );
    const batch = await this.prisma.omrBatch.findUnique({
      where: { id: job.data.batchId },
      include: {
        exam: { include: { classes: true } },
        submissions: true,
      },
    });
    if (!batch) return;

    await this.notificationsService.createManyDeduped([
      {
        type: 'OMR_BATCH_COMPLETED',
        recipientId: batch.teacherId,
        roleTarget: Role.TEACHER,
        entityId: batch.examId,
        batchId: batch.id,
        routeIntent: {
          route: 'TeacherOmrExamDetail',
          examId: batch.examId,
        },
        title: `Đã chấm xong: ${batch.exam.title}`,
        body: `Đã xử lý ${batch.processedFiles}/${batch.totalFiles} bài, bấm để xem kết quả.`,
        dedupeKey: `omr-batch-completed:${batch.id}:${batch.teacherId}`,
      },
    ]);
  }

  private async getStudentsWithoutSubmit(
    assignmentId: string,
    enrollments: { studentId: string }[],
  ) {
    const submits = await this.prisma.assignmentSubmit.findMany({
      where: { assignmentId },
      select: { studentId: true },
    });
    const submittedStudentIds = new Set(submits.map((s) => s.studentId));
    return enrollments
      .filter((e) => !submittedStudentIds.has(e.studentId))
      .map((e) => ({ id: e.studentId }));
  }
}
