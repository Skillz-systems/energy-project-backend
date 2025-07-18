import { Module } from '@nestjs/common';
import { TaskManagementService } from './task-management.service';
import { TaskManagementController } from './task-management.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgentsModule } from 'src/agents/agents.module';
import { SalesModule } from 'src/sales/sales.module';
import { InstallerService } from 'src/installer/installer.service';

@Module({
  imports: [AgentsModule, SalesModule],
  controllers: [TaskManagementController],
  providers: [TaskManagementService, PrismaService, InstallerService],
})
export class TaskManagementModule {}
