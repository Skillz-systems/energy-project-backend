import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SalesStatus } from '@prisma/client';

@Injectable()
export class CronjobsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(CronjobsService.name);

  @Cron(CronExpression.EVERY_6_HOURS, {
    name: 'checkUnpaidSales',
  })
  async checkUnpaidSales() {
    this.logger.log('Running cron job to check unpaid sales...');

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const unpaidSales = await this.prisma.sales.findMany({
      where: { status: SalesStatus.UNPAID, createdAt: { lte: sixHoursAgo } }, // Find records created 6+ hours ago },
      include: { saleItems: true, batchAllocations: true },
    });

    for (const sale of unpaidSales) {
      this.logger.log(`Restoring inventory for Sale ID: ${sale.id}`);

      if (!sale.batchAllocations.length) {
        this.logger.log(`Batch Allocations not found Sale ID: ${sale.id}`);
        continue;
      }

      for (const { inventoryBatchId: id, quantity } of sale.batchAllocations) {
        await this.prisma.inventoryBatch.update({
          where: { id },
          data: {
            remainingQuantity: {
              increment: quantity,
            },
          },
        });
      }

      await this.prisma.sales.update({
        where: { id: sale.id },
        data: { status: SalesStatus.CANCELLED },
      });

      await this.prisma.payment.update({
        where: {
          id: sale.id,
        },
        data: { paymentStatus: PaymentStatus.FAILED },
      });

      this.logger.log(
        `Inventory Restration for Sale ID: ${sale.id} successful`,
      );
    }
  }
}
