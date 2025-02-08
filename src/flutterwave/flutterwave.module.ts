import { Module } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';
import { FlutterwaveController } from './flutterwave.controller';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FlutterwaveController],
  providers: [FlutterwaveService, ConfigService, PrismaService],
})
export class FlutterwaveModule {}
