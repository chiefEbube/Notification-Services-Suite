import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext, Transport } from '@nestjs/microservices';
import { EmailService } from './email.service';

@Controller()
export class EmailController {
    constructor(private readonly emailService: EmailService) {}

    @MessagePattern('email_queue', Transport.RMQ)
    async handleEmailJob(@Payload() data: any, @Ctx() context: RmqContext) {
        const channel = context.getChannelRef();
        const originalMessage = context.getMessage();

        try {
            await this.emailService.processEmailJob(data);
            channel.ack(originalMessage);
        } catch (error) {
            channel.nack(originalMessage, false, false);
        }
    }
}
