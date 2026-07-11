import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateNotificationInput } from '../notification.types';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createManyDeduped(items: CreateNotificationInput[]) {
    if (!items.length) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: items.map((item) => ({
        ...item,
        routeIntent: item.routeIntent as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async listForRecipient(recipientId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
