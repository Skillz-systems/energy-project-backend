import { Exclude } from 'class-transformer';
import { Category, CategoryTypes} from '@prisma/client';

export class CategoryEntity implements Partial<Category> {
  id: string;
  parentId: string;
  type: CategoryTypes;

  @Exclude()
  createdAt: Date;
  @Exclude()
  updatedAt: Date;
  @Exclude()
  deletedAt: Date;

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }
}
