import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import Opossum from 'opossum'

@Injectable()
export class EmailService {
    private userServiceUrl: string;
    private templateServiceUrl: string;

    private sendgridFromEmail: string;

    private userServiceBreaker: Opossum;
    private templateServiceBreaker: Opossum;

    constructor(
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly sendgridService: SendgridService,
        
    ) {
        this.userServiceUrl = this.configService.getOrThrow<string>('USER_SERVICE_URL');
        this.templateServiceUrl = this.configService.getOrThrow<string>('TEMPLATE_SERVICE_URL');
        this.sendgridFromEmail = this.configService.getOrThrow<string>('SENDGRID_FROM_EMAIL')

        const breakerOptions = {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        };

        this.userServiceBreaker =  new Opossum(
            (userId: string) => firstValueFrom(this.httpService.get(`${this.userServiceUrl}/api/v1/users/${userId}`)),
            breakerOptions,
        );

        this.templateServiceBreaker =  new Opossum(
            (templateCode: string) => firstValueFrom(this.httpService.get(`${this.templateServiceUrl}/api/v1/templates/${templateCode}`)),
            breakerOptions,
        )
    }

    async processEmailJob(jobData: any) {
        console.log('Received email job:', jobData.request_id);

        try {
            // Fetch user details from cache or user service
            const cacheKey = `user:${jobData.user_id}`;
            let user = await this.cache.get<any>(cacheKey);

            if (!user) {
                console.log(`Cache miss for key: ${cacheKey}`);

                const userResponse: any = await this.userServiceBreaker.fire(jobData.user_id,);
                user = userResponse.data.data;
                await this.cache.set(cacheKey, user);
            } else {
                console.log(`Cache hit for key: ${cacheKey}`);              
            }

            if (!user.preferences || user.preferences.email === false) {
                console.log(`User ${jobData.user_id} has disabled email notifications. Skipping...`);
                return true;
            }

            const templateCacheKey = `template:${jobData.template_id}`;
            let templateContent = await this.cache.get<string>(templateCacheKey);

            if (!templateContent) {
                console.log(`Cache miss for key: ${templateCacheKey}`);
                const templateResponse: any = await this.templateServiceBreaker.fire(jobData.template_id);
    
                templateContent = templateResponse.data.data.content;
                if (!templateContent) {
                    throw new Error(`Template content not found for template_id: ${jobData.template_id}`);
                }
                await this.cache.set(templateCacheKey, templateContent);
              } else {
                console.log(`Cache hit for key: ${templateCacheKey}`);
              }

            let finalContent = templateContent;
            if (jobData.variables) {
                Object.keys(jobData.variables).forEach(key => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    finalContent = finalContent.replace(regex, String(jobData.variables[key]));
                });
            }

            await this.sendgridService.sendEmail({
                to: user.email,
                from: this.sendgridFromEmail,
                subject: 'Test Email',
                html: finalContent,
            })

            console.log('Job completed successfully: ', jobData.request_id);
            return true;


        } catch (error) {
            console.error('Job failed: ', jobData.request_id, error.message);
            throw error;
        }
    }
}
