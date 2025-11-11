import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendgridService } from 'src/sendgrid/sendgrid.service';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
    private userServiceUrl: string;
    private templateServiceUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly sendgridService: SendgridService,
    ) {
        this.userServiceUrl = this.configService.getOrThrow<string>('USER_SERVICE_URL');
        this.templateServiceUrl = this.configService.getOrThrow<string>('TEMPLATE_SERVICE_URL');
    }

    async processEmailJob(jobData: any) {
        console.log('Received email job:', jobData.request_id);

        try {
            // Fetch user details
            const userResponse = await firstValueFrom(this.httpService.get(`${this.userServiceUrl}/api/v1users/${jobData.user_id}`,),);
            const user = userResponse.data.data;

            if (!user.preferences || user.preferences.email === false) {
                console.log(`User ${jobData.user_id} has disabled email notifications. Skipping...`);
                return true;
            }

            const templateResponse = await firstValueFrom(this.httpService.get(`${this.templateServiceUrl}/api/v1templates/${jobData.template_code}`,));
            const htmlTemplate = templateResponse.data.html // Assuming the template service returns the HTML string in data

            const template = Handlebars.compile(htmlTemplate);
            const finalHtml = template(jobData.variables);

            await this.sendgridService.sendEmail({
                to: user.email,
                from: '', // sendGrid sender
                subject: 'Test Email', // To Do: Use the template subject
                html: finalHtml,
            })

            console.log('Job completed successfully: ', jobData.request_id);
            return true;


        } catch (error) {
            console.error('Job failed: ', jobData.request_id, error.message);
            throw error;
        }
    }
}
