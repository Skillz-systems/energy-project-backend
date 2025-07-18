import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigService } from '@nestjs/config';
import { EmailModule } from '../mailer/email.module';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { EmailService } from '../mailer/email.service';
import { BullModule } from '@nestjs/bullmq';
import { PaymentProcessor } from './payment.processor';
import { TermiiService } from '../termii/termii.service';
import { HttpModule } from '@nestjs/axios';
import { OgaranyaService } from 'src/ogaranya/ogaranya.service';
import { WalletService } from 'src/wallet/wallet.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    EmailModule,
    BullModule.registerQueue({
      name: 'payment-queue',
    }),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    ConfigService,
    OpenPayGoService,
    PrismaService,
    FlutterwaveService,
    EmailService,
    PaymentProcessor,
    TermiiService,
    OgaranyaService,
    WalletService,
  ],
  exports: [
    PaymentService,
    ConfigService,
    OpenPayGoService,
    PrismaService,
    FlutterwaveService,
    EmailService,
    PaymentProcessor,
    TermiiService,
    OgaranyaService,
    WalletService,
  ],
})
export class PaymentModule {}
