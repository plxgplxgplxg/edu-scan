import { Role } from '@prisma/client';

export type NotificationType =
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_DUE_SOON'
  | 'ASSIGNMENT_OVERDUE'
  | 'TEACHER_ASSIGNMENT_SUMMARY'
  | 'OMR_BATCH_COMPLETED'
  | 'SYSTEM';

export type NotificationRouteIntent =
  | {
      route: 'StudentClassDetail';
      classId: string;
      assignmentId?: string;
      mode?: 'submit' | 'readonly';
    }
  | {
      route: 'TeacherClassDetail';
      classId: string;
      assignmentId?: string;
    }
  | {
      route: 'TeacherOmrBatchDetail';
      batchId: string;
    }
  | {
      route: 'TeacherOmrExamDetail';
      examId: string;
    }
  | {
      route: 'SharedNotifications';
    }
  | {
      route: 'StudentDashboard';
    };

export type CreateNotificationInput = {
  type: NotificationType;
  recipientId: string;
  roleTarget: Role;
  entityId?: string;
  classId?: string;
  assignmentId?: string;
  batchId?: string;
  routeIntent: NotificationRouteIntent;
  title: string;
  body: string;
  dedupeKey: string;
};
