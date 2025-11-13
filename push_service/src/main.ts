import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const rabbitMqUrl = configService.getOrThrow<string>('RABBITMQ_URL');
  const port = configService.getOrThrow('PORT');

  // Connect to RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
      queue: 'push_queue',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`Push service HTTP server listening on port ${port}`);
  console.log('Push service is listening for messages from push_queue...');
}
bootstrap();
