import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { ContractService } from '../contract/contract.service';
import { EmailService } from '../mailer/email.service';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TermiiService } from '../termii/termii.service';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CloudinaryModule,
    BullModule.registerQueue({
      name: 'payment-queue',
    }),
    WalletModule,
  ],
  controllers: [SalesController],
  providers: [
    SalesService,
    PrismaService,
    PaymentService,
    OpenPayGoService,
    ContractService,
    EmailService,
    FlutterwaveService,
    TermiiService,
    ConfigService,
  ],
  exports: [
    SalesService,
    PaymentService,
    OpenPayGoService,
    ContractService,
    EmailService,
    FlutterwaveService,
    TermiiService,
    ConfigService,
  ],
})
export class SalesModule {}
