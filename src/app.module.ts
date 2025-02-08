import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './mailer/email.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { AgentsModule } from './agents/agents.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { PaymentModule } from './payment/payment.module';
import { DeviceModule } from './device/device.module';
import { ContractModule } from './contract/contract.module';
import { OpenpaygoModule } from './openpaygo/openpaygo.module';
import { FlutterwaveModule } from './flutterwave/flutterwave.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CronjobsModule } from './cronjobs/cronjobs.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 10000, // 15 minutes
        limit: 6,
        blockDuration: 120000, // 2 mins
      },
    ]),

    ScheduleModule.forRoot(),

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EmailModule,
    CloudinaryModule,
    PrismaModule,
    AuthModule,
    RolesModule,
    UsersModule,
    PermissionsModule,
    InventoryModule,
    ProductsModule,
    AgentsModule,
    CustomersModule,
    SalesModule,
    PaymentModule,
    DeviceModule,
    ContractModule,
    OpenpaygoModule,
    FlutterwaveModule,
    CronjobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
