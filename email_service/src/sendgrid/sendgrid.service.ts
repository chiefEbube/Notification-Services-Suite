import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sendGridMail from '@sendgrid/mail';

@Injectable()
export class SendgridService implements OnModuleInit {
    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
        if (apiKey) {
            sendGridMail.setApiKey(apiKey);
        } else {
            console.warn('SENDGRID_API_KEY not set. Email sending will be disabled.');
        }
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
