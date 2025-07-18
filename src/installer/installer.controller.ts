import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetSessionUser } from '../auth/decorators/getUser';
import { AgentAccessGuard } from '../auth/guards/agent-access.guard';
import { AgentCategory, TaskStatus } from '@prisma/client';
import { InstallerService } from './installer.service';

@Controller('installer')
@UseGuards(JwtAuthGuard, AgentAccessGuard)
export class InstallerController {
  constructor(private readonly installerTaskService: InstallerService) {}

  @Get('dashboard')
  async getDashboard(@GetSessionUser('agent') agent: any) {
    return await this.installerTaskService.getInstallerDashboard(agent.id);
  }

  @Get('tasks')
  async getTasks(
    @GetSessionUser('agent') agent: any,
    @Query('status') status?: TaskStatus,
  ) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.getInstallerTasks(agent.id, status);
  }

  @Get('tasks/:id')
  async getTask(
    @Param('id') taskId: string,
    @GetSessionUser('agent') agent: any,
  ) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }
    
    return this.installerTaskService.getInstallerTask(agent.id, taskId);
  }

  @Post('tasks/:id/accept')
  async acceptTask(
    @Param('id') taskId: string,
    @GetSessionUser('agent') agent: any,
  ) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.acceptTask(taskId, agent.id);
  }

  @Post('tasks/:id/reject')
  async rejectTask(
    @Param('id') taskId: string,
    @Body() body: { reason?: string },
    @GetSessionUser('agent') agent: any,
  ) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.rejectTask(taskId, agent.id, body.reason);
  }

  @Post('tasks/:id/complete')
  async completeTask(
    @Param('id') taskId: string,
    @GetSessionUser('agent') agent: any,
  ) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.completeTask(taskId, agent.id);
  }

  @Get('installation-history')
  async getInstallationHistory(@GetSessionUser('agent') agent: any) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.getInstallationHistory(agent.id);
  }

  @Get('task-history')
  async getTaskHistory(@GetSessionUser('agent') agent: any) {
    if (agent.category !== AgentCategory.INSTALLER) {
      throw new ForbiddenException('Access denied - Installer only');
    }

    return this.installerTaskService.getTaskHistory(agent.id);
  }
}
