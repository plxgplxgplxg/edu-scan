import { Injectable, Logger } from '@nestjs/common';
import type { CreateNotificationInput } from '../notification.types';

@Injectable()
export class PushProviderService {
  private readonly logger = new Logger(PushProviderService.name);

  sendPushNotification(notification: CreateNotificationInput): Promise<void> {
    // TODO: Implement actual push provider (e.g. Firebase Cloud Messaging / APNs)
    // Needs external configuration and device token persistence in User model.
    this.logger.debug(
      `[Push Seam] Would send push to ${notification.recipientId}: ${notification.title}`,
    );
    return Promise.resolve();
  }
}
