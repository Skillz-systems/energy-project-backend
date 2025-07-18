import { Module } from '@nestjs/common';
import { CronjobsService } from './cronjobs.service';
import { CronjobsController } from './cronjobs.controller';
import { EmailModule } from '../mailer/email.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [EmailModule, PaymentModule],
  controllers: [CronjobsController],
  providers: [CronjobsService],
})
export class CronjobsModule {}
