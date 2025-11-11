import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { HttpModule } from '@nestjs/axios';
import { SendgridModule } from 'src/sendgrid/sendgrid.module';

@Module({
  imports: [HttpModule, SendgridModule],
  providers: [EmailService],
  controllers: [EmailController]
})
export class EmailModule {}
