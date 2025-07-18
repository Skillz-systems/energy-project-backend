import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from 'src/auth/guards/roles.guard';
import { InstallerService } from 'src/installer/installer.service';
import { AgentsService } from 'src/agents/agents.service';
import { RolesAndPermissions } from 'src/auth/decorators/roles.decorator';
import { ActionEnum, AgentCategory, SaleItem, Sales, SubjectEnum } from '@prisma/client';
import { GetSessionUser } from 'src/auth/decorators/getUser';
import { CreateTaskDto } from './dto/create-task.dto';
import { SalesService } from 'src/sales/sales.service';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { TaskManagementService } from './task-management.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
export class TaskManagementController {
  constructor(
    private readonly installerService: InstallerService,
    private readonly taskManagementService: TaskManagementService,
    private readonly agentService: AgentsService,
    private readonly salesService: SalesService,
  ) {}

  @Post('create:saleId')
  @ApiParam({
    name: 'id',
    description: 'Sale id to fetch details.',
  })
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @Param('id') saleId: string,
    @GetSessionUser('id') userId: string,
  ) {
    const sale = (await this.salesService.getSale(saleId)) as SaleItem & {
      sale: Sales;
    };

    return this.installerService.createTask({
      saleId,
      customerId: createTaskDto.customerId || sale.sale.customerId,
      assignedBy: userId,
      ...createTaskDto,
      scheduledDate: createTaskDto.scheduledDate,
    });
  }

  @Get('installer-agents')
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  async getInstallerAgents() {
    return this.agentService.getAgentsByCategory(AgentCategory.INSTALLER);
  }

  @ApiOperation({ description: 'Assign task to installer agent' })
  @Post(':id/assign-installer-task')
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  async assignInstaller(
    @Param('id') taskId: string,
    @Body() body: { installerAgentId: string },
    @GetSessionUser('id') adminId: string,
  ) {
    return this.taskManagementService.assignInstallerTask(
      taskId,
      body.installerAgentId,
      adminId,
    );
  }
}
