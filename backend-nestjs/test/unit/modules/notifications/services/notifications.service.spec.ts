import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { NotificationsRepository } from '../../../../../src/modules/notifications/repositories/notifications.repository';
import {
  NOTIFICATIONS_QUEUE_NAME,
  NotificationsService,
} from '../../../../../src/modules/notifications/services/notifications.service';
import { PushProviderService } from '../../../../../src/modules/notifications/services/push-provider.service';

const mockNotificationsRepository = () => ({
  createManyDeduped: jest.fn(),
  listForRecipient: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
});

const mockPushProviderService = () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
});

const mockNotificationsQueue = () => ({
  add: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: ReturnType<typeof mockNotificationsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useFactory: mockNotificationsRepository,
        },
        { provide: PushProviderService, useFactory: mockPushProviderService },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useFactory: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationsRepository);
    repository.createManyDeduped.mockResolvedValue({ count: 1 });
  });

  it('creates a graded assignment notification for the student only', async () => {
    await service.createAssignmentGradedNotification({
      assignmentId: 'assignment-1',
      classId: 'class-1',
      title: 'Bài tập chương 1',
      studentId: 'student-1',
    });

    expect(repository.createManyDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'ASSIGNMENT_GRADED',
        recipientId: 'student-1',
        roleTarget: Role.STUDENT,
        title: 'Bài tập chương 1',
        body: 'Bài tập "Bài tập chương 1" đã được chấm.',
        dedupeKey: 'assignment-graded:assignment-1:student-1',
      }),
    ]);
  });
});
