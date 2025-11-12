import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { SendgridModule } from '../sendgrid/sendgrid.module';

@Module({
  imports: [SendgridModule],
  providers: [EmailService],
  controllers: [EmailController]
})
export class EmailModule {}
