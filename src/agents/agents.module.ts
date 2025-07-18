import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../mailer/email.module';
import { OgaranyaService } from '../ogaranya/ogaranya.service';
import { WalletService } from '../wallet/wallet.service';
import { ProductsModule } from 'src/products/products.module';
import { SalesModule } from 'src/sales/sales.module';
import { CustomersModule } from 'src/customers/customers.module';
import { InstallerService } from 'src/installer/installer.service';

@Module({
  imports: [EmailModule, ProductsModule, SalesModule, CustomersModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    PrismaService,
    OgaranyaService,
    WalletService,
    InstallerService,
  ],
  exports: [AgentsService, OgaranyaService, WalletService, InstallerService],
})
export class AgentsModule {}
