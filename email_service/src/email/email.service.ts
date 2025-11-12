import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { EmailJobData } from './interfaces/email.types';

@Injectable()
export class EmailService {
    private sendgridFromEmail: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly sendgridService: SendgridService,
    ) {
        this.sendgridFromEmail = this.configService.getOrThrow<string>('SENDGRID_FROM_EMAIL');
    }

    async processEmailJob(jobData: EmailJobData): Promise<boolean> {
        console.log('Received email job:', jobData.correlation_id);

        try {
            // Validate notification type
            if (jobData.notification_type !== 'email') {
                console.log(`Skipping non-email notification (type: ${jobData.notification_type}) for correlation_id: ${jobData.correlation_id}`);
                return true;
            }

            // Check user preferences
            if (!jobData.user_data?.preferences?.email) {
                console.log(`User ${jobData.user_id} has disabled email notifications. Skipping...`);
                return true;
            }

            // Validate required data
            if (!jobData.user_data?.email) {
                throw new Error(`User email not found for user_id: ${jobData.user_id}`);
            }

            if (!jobData.template_content) {
                throw new Error(`Template content not provided for template_id: ${jobData.template_id}`);
            }

            // Substitute variables in template content
            let finalContent = jobData.template_content;
            if (jobData.variables) {
                Object.keys(jobData.variables).forEach(key => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    const value = jobData.variables?.[key];
                    if (value !== undefined) {
                        finalContent = finalContent.replace(regex, String(value));
                    }
                });
            }

            // Send email via SendGrid
            await this.sendgridService.sendEmail({
                to: jobData.user_data.email,
                from: this.sendgridFromEmail,
                subject: 'Notification',
                html: finalContent,
            });

            console.log('Job completed successfully: ', jobData.correlation_id);
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Job failed: ', jobData.correlation_id, errorMessage);
            throw error;
        }
    }
}
