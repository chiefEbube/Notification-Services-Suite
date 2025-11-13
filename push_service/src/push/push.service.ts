import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FcmService } from '../fcm/fcm.service';
import { PushJobData, PushNotificationPayload } from './interfaces/push.types';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fcmService: FcmService,
  ) {}

  async processPushJob(jobData: PushJobData): Promise<boolean> {
    this.logger.log(`Received push job: ${jobData.correlation_id}`);

    try {
      // Validate notification type
      if (jobData.notification_type !== 'push') {
        this.logger.log(
          `Skipping non-push notification (type: ${jobData.notification_type}) for correlation_id: ${jobData.correlation_id}`,
        );
        return true;
      }

      // Check user preferences
      if (!jobData.user_data?.preferences?.push) {
        this.logger.log(
          `User ${jobData.user_id} has disabled push notifications. Skipping...`,
        );
        return true;
      }

      // Validate required data
      if (!jobData.user_data?.push_token) {
        throw new Error(
          `Push token not found for user_id: ${jobData.user_id}`,
        );
      }

      if (!jobData.template_content) {
        throw new Error(
          `Template content not provided for template_id: ${jobData.template_id}`,
        );
      }

      // Parse template content (assuming it's JSON with title, body, etc.)
      let notificationPayload: PushNotificationPayload;
      try {
        notificationPayload = JSON.parse(jobData.template_content);
      } catch {
        // If not JSON, treat as plain text body
        notificationPayload = {
          title: 'Notification',
          body: jobData.template_content,
        };
      }

      // Substitute variables in template
      if (jobData.variables) {
        Object.keys(jobData.variables).forEach((key) => {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          const value = jobData.variables?.[key];
          if (value !== undefined) {
            if (notificationPayload.title) {
              notificationPayload.title = notificationPayload.title.replace(
                regex,
                String(value),
              );
            }
            if (notificationPayload.body) {
              notificationPayload.body = notificationPayload.body.replace(
                regex,
                String(value),
              );
            }
            if (notificationPayload.link) {
              notificationPayload.link = notificationPayload.link.replace(
                regex,
                String(value),
              );
            }
          }
        });
      }

      // Send push notification via FCM
      // FCM will handle invalid tokens and return appropriate errors
      await this.fcmService.sendPushNotification(
        jobData.user_data.push_token,
        notificationPayload,
      );

      this.logger.log(
        `Job completed successfully: ${jobData.correlation_id}`,
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Job failed: ${jobData.correlation_id}, ${errorMessage}`,
      );
      throw error;
    }
  }
}

