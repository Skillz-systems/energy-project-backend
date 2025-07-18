import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async assignInstallerTask(
    taskId: string,
    installerAgentId: string,
    adminId: string,
  ) {
    return this.prisma.installerTask.update({
      where: { id: taskId },
      data: {
        installerAgentId: installerAgentId,
        assignedBy: adminId,
      },
    });
  }
}
