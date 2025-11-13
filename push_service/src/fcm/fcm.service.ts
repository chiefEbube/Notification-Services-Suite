import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    try {
      // Option 1: Using service account JSON (recommended for production)
      const serviceAccountPath = this.configService.get<string>('FCM_SERVICE_ACCOUNT_PATH');
      
      if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // Option 2: Using environment variables
        const projectId = this.configService.getOrThrow<string>('FCM_PROJECT_ID');
        const privateKey = this.configService.getOrThrow<string>('FCM_PRIVATE_KEY').replace(/\\n/g, '\n');
        const clientEmail = this.configService.getOrThrow<string>('FCM_CLIENT_EMAIL');

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
      }

      this.logger.log('Firebase Admin initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
      throw error;
    }
  }

  async sendPushNotification(
    token: string,
    payload: {
      title: string;
      body: string;
      image?: string;
      link?: string;
      data?: Record<string, string>;
    },
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: {
          ...payload.data,
          ...(payload.link && { link: payload.link }),
        },
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.image,
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Use validate-only to check token without sending
      // Note: This is a simplified validation - in production you might want
      // to cache valid tokens or use a different validation strategy
      const result = await admin.messaging().send({
        token,
        notification: {
          title: 'Validation',
          body: 'Token validation',
        },
      }, true); // dry run mode
      return true;
    } catch (error: any) {
      // Check for invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-argument') {
        this.logger.warn(`Invalid push token detected: ${error.code}`);
        return false;
      }
      // For other errors, log but don't fail validation (might be temporary)
      this.logger.warn(`Token validation error: ${error.code}`);
      return true; // Assume valid if we can't determine
    }
  }
}

