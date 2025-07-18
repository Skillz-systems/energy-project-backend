import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { OgaranyaService } from 'src/ogaranya/ogaranya.service';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [WalletController],
  providers: [WalletService, PrismaService, OgaranyaService],
  exports: [WalletService, OgaranyaService],
})
export class WalletModule {}
