import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigService } from '@nestjs/config';
import { EmailModule } from '../mailer/email.module';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { EmailService } from '../mailer/email.service';

@Module({
  imports: [EmailModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    ConfigService,
    OpenPayGoService,
    PrismaService,
    FlutterwaveService,
    EmailService
  ],
})
export class PaymentModule {}
