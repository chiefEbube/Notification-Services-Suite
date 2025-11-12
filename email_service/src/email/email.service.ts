import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import Opossum from 'opossum';
import { AxiosResponse } from 'axios';
import {
  EmailJobData,
  User,
  UserServiceResponse,
  TemplateServiceResponse,
} from './interfaces/email.types';

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

        // Breaker options for user and template service
        const breakerOptions = {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        };

        // Breaker for user service
        this.userServiceBreaker = new Opossum(
            (userId: string) => firstValueFrom(this.httpService.get<UserServiceResponse>(`${this.userServiceUrl}/api/v1/users/${userId}`)),
            breakerOptions,
        );

        // Breaker for template service
        this.templateServiceBreaker = new Opossum(
            (templateCode: string) => firstValueFrom(this.httpService.get<TemplateServiceResponse>(`${this.templateServiceUrl}/api/v1/templates/${templateCode}`)),
            breakerOptions,
        );
    }

    async processEmailJob(jobData: EmailJobData): Promise<boolean> {
        console.log('Received email job:', jobData.request_id);

        try {
            // Fetch user details from cache or user service
            const cacheKey = `user:${jobData.user_id}`;
            let user = await this.cache.get<User>(cacheKey);

            if (!user) {
                console.log(`Cache miss for key: ${cacheKey}`);

                const userResponse = await this.userServiceBreaker.fire(jobData.user_id) as AxiosResponse<UserServiceResponse>;
                user = userResponse.data.data;
                await this.cache.set(cacheKey, user);
            } else {
                console.log(`Cache hit for key: ${cacheKey}`);              
            }

            if (!user) {
                throw new Error(`User not found for user_id: ${jobData.user_id}`);
            }

            if (!user.preferences || user.preferences.email === false) {
                console.log(`User ${jobData.user_id} has disabled email notifications. Skipping...`);
                return true;
            }

            // Fetch template content from cache or template service
            const templateCacheKey = `template:${jobData.template_id}`;
            let templateContent = await this.cache.get<string>(templateCacheKey);

            if (!templateContent) {
                console.log(`Cache miss for key: ${templateCacheKey}`);
                const templateResponse = await this.templateServiceBreaker.fire(jobData.template_id) as AxiosResponse<TemplateServiceResponse>;
    
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
                    const value = jobData.variables?.[key];
                    if (value !== undefined) {
                        finalContent = finalContent.replace(regex, String(value));
                    }
                });
            }

            await this.sendgridService.sendEmail({
                to: user.email,
                from: this.sendgridFromEmail,
                subject: 'Test Email',
                html: finalContent,
            });

            console.log('Job completed successfully: ', jobData.request_id);
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Job failed: ', jobData.request_id, errorMessage);
            throw error;
        }
    }
}
