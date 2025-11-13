import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { PushService } from './push.service';
import type { PushJobData } from './interfaces/push.types';

@Controller()
export class PushController {
  private readonly logger = new Logger(PushController.name);

  constructor(private readonly pushService: PushService) {}

  @MessagePattern('push_queue', Transport.RMQ)
  async handlePushJob(
    @Payload() data: PushJobData,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    try {
      await this.pushService.processPushJob(data);
      channel.ack(originalMessage);
      this.logger.log(
        `Push notification processed successfully: ${data.correlation_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process push notification: ${data.correlation_id}`,
        error,
      );
      // Reject message and don't requeue (will go to dead letter queue)
      channel.nack(originalMessage, false, false);
    }
  }
}

