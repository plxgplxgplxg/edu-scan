import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsRepository } from './repositories/notifications.repository';
import {
  NotificationsService,
  NotificationsProcessor,
  NOTIFICATIONS_QUEUE_NAME,
} from './services/notifications.service';
import { PushProviderService } from './services/push-provider.service';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE_NAME,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsProcessor,
    PushProviderService,
  ],
  exports: [NotificationsService, PushProviderService, BullModule],
})
export class NotificationsModule {}
