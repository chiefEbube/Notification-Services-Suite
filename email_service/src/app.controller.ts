import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Transport } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,

  ) {}

  @Get('health')
  @HealthCheck()
  getHealth() {
    const rabbitMqUrl = this.configService.getOrThrow<string>('RABBITMQ_URL');

    return this.health.check([
      () => this.microservice.pingCheck('rabbitmq', {
        transport: Transport.RMQ,
        options: {
          urls: [rabbitMqUrl],
        },
      }),

      async () => {
        try {
          await this.cache.set('health_check', 'ok', 1000);
          const result = await this.cache.get('health_check');

          if (result !== 'ok') {
            throw new Error('Cache GET/SET failed');
          }

          return { redis: { status: 'up' } };
        } catch (error) {
          return { redis: { status: 'down', error: error.message } };
        }
      }
    ])
  }
}
