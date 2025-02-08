import { Module } from '@nestjs/common';
import { CronjobsService } from './cronjobs.service';
import { CronjobsController } from './cronjobs.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CronjobsController],
  providers: [CronjobsService, PrismaService],
})
export class CronjobsModule {}
