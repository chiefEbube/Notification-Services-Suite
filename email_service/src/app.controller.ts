import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
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
    ])
  }
}
