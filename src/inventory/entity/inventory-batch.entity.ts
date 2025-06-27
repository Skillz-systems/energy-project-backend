import { Exclude } from 'class-transformer';
import { Inventory, User} from '@prisma/client';

export class InventoryBatchEntity implements Partial<Inventory> {
  costOfItem: number;
  price: number;
  pricbatchNumber: number;
  numberOfStock: number;
  remainingQuantity: number;
  creatorDetails: User;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  deletedAt: Date;

  constructor(partial: Partial<InventoryBatchEntity>) {
    Object.assign(this, partial);
  }
}
