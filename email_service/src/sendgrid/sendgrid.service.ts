import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sendGridMail from '@sendgrid/mail';

@Injectable()
export class SendgridService implements OnModuleInit {
    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.getOrThrow<string>('SENDGRID_API_KEY');
        sendGridMail.setApiKey(apiKey);
    }

    async sendEmail(msg: sendGridMail.MailDataRequired) {
        try {
            await sendGridMail.send(msg);
            console.log(`Email sent successfully to: ${msg.to}`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}
