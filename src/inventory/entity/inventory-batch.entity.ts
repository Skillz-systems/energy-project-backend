import { Exclude } from 'class-transformer';
import { Inventory, InventoryClass, InventoryStatus } from '@prisma/client';

export class InventoryBatchEntity implements Partial<Inventory> {
  costOfItem: number;
  price: number;
  pricbatchNumber: number;
  numberOfStock: number;
  remainingQuantity: number;

  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
  @Exclude()
  deletedAt: Date;

  constructor(partial: Partial<InventoryBatchEntity>) {
    Object.assign(this, partial);
  }
}
