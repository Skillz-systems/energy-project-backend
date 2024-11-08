import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MESSAGES } from '../constants';
import { CategoryTypes, InventoryClass, Prisma } from '@prisma/client';
import { FetchInventoryQueryDto } from './dto/fetch-inventory.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async inventoryFilter(
    query: FetchInventoryQueryDto,
  ): Promise<Prisma.InventoryWhereInput> {
    const {
      search,
      inventoryCategoryId,
      inventorySubCategoryId,
      createdAt,
      updatedAt,
      class: inventoryClass,
    } = query;

    const filterConditions: Prisma.InventoryWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { manufacturerName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        inventoryCategoryId ? { inventoryCategoryId } : {},
        inventorySubCategoryId ? { inventorySubCategoryId } : {},
        createdAt ? { createdAt: new Date(createdAt) } : {},
        updatedAt ? { updatedAt: new Date(updatedAt) } : {},
        inventoryClass
          ? {
              batches: {
                some: { class: inventoryClass as InventoryClass },
              },
            }
          : {},
      ],
    };

    return filterConditions;
  }

  async uploadInventoryImage(file: Express.Multer.File) {
    return await this.cloudinary.uploadFile(file).catch((e) => {
      throw e;
    });
  }

  async createInventory(
    createInventoryDto: CreateInventoryDto,
    file: Express.Multer.File,
  ) {
    const { inventorySubCategoryId, inventoryCategoryId } = createInventoryDto;

    const isCategoryValid = await this.prisma.category.findFirst({
      where: {
        id: inventoryCategoryId,
        children: {
          some: {
            id: inventorySubCategoryId,
            type: CategoryTypes.INVENTORY,
          },
        },
        type: CategoryTypes.INVENTORY,
      },
    });

    if (!isCategoryValid) {
      throw new BadRequestException(
        'Invalid inventorySubCategoryId or inventoryCategoryId',
      );
    }

    const image = (await this.uploadInventoryImage(file)).secure_url;

    let inventoryData = await this.prisma.inventory.findFirst({
      where: {
        name: {
          equals: createInventoryDto.name,
          mode: 'insensitive',
        },
        manufacturerName: {
          equals: createInventoryDto.manufacturerName,
          mode: 'insensitive',
        },
      },
    });

    if (!inventoryData) {
      inventoryData = await this.prisma.inventory.create({
        data: {
          name: createInventoryDto.name,
          manufacturerName: createInventoryDto.manufacturerName,
          inventoryCategoryId: createInventoryDto.inventoryCategoryId,
          inventorySubCategoryId: createInventoryDto.inventorySubCategoryId,
        },
      });
    }

    const batchNumber = this.generateBatchNumber();

    await this.prisma.inventoryBatch.create({
      data: {
        inventory: { connect: { id: inventoryData.id } },
        name: createInventoryDto.name,
        ...(createInventoryDto.dateOfManufacture !== undefined && {
          dateOfManufacture: createInventoryDto.dateOfManufacture,
        }),
        ...(createInventoryDto.sku !== undefined && {
          sku: createInventoryDto.sku,
        }),
        ...(createInventoryDto.costOfItem !== undefined && {
          costOfItem: parseFloat(createInventoryDto.costOfItem),
        }),
        image,
        batchNumber: Number(batchNumber),
        price: parseFloat(createInventoryDto.price),
        numberOfStock: Number(createInventoryDto.numberOfStock),
        remainingQuantity: Number(createInventoryDto.numberOfStock),
        class: createInventoryDto.class,
      },
    });

    return {
      message: MESSAGES.INVENTORY_CREATED,
    };
  }

  async getInventories(query: FetchInventoryQueryDto) {
    const {
      page = 1,
      limit = 100,
      sortField,
      sortOrder,
      inventoryCategoryId,
      inventorySubCategoryId,
    } = query;

    if (inventoryCategoryId || inventorySubCategoryId) {
      const categoryIds = [inventoryCategoryId, inventorySubCategoryId].filter(
        Boolean,
      );

      const isCategoryValid = await this.prisma.category.findFirst({
        where: {
          id: {
            in: categoryIds,
          },
          type: CategoryTypes.INVENTORY,
        },
      });

      if (!isCategoryValid) {
        throw new BadRequestException(
          'Invalid inventorySubCategoryId or inventoryCategoryId',
        );
      }
    }

    const filterConditions = await this.inventoryFilter(query);

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const orderBy = sortField
      ? {
          [sortField]: sortOrder || 'asc',
        }
      : undefined;

    const result = await this.prisma.inventory.findMany({
      skip,
      take,
      where: filterConditions,
      orderBy,
      include: {
        batches: true,
        inventoryCategory: true,
        inventorySubCategory: true,
      },
    });

    const totalCount = await this.prisma.inventory.count({
      where: filterConditions,
    });

    return {
      inventories: result,
      total: totalCount,
      page,
      limit,
      totalPages: limitNumber === 0 ? 0 : Math.ceil(totalCount / limitNumber),
    };
  }

  async fetchInventoryBatchDetails(id: string) {
    const inventoryBatch = await this.prisma.inventoryBatch.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!inventoryBatch) {
      throw new NotFoundException(MESSAGES.BATCH_NOT_FOUND);
    }

    return inventoryBatch;
  }

  async createInventoryCategory(categories: CreateCategoryDto[]) {
    const existingCategoryNames = [];

    for (const category of categories) {
      const { name, subCategories, parentId } = category;

      const existingCategory = await this.prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory) {
        existingCategoryNames.push(name);
        continue;
      }

      if (parentId) {
        const existingParentCategory = await this.prisma.category.findFirst({
          where: { id: parentId },
        });

        if (!existingParentCategory) {
          throw new BadRequestException('Invalid Parent Id');
        }
      }

      await this.prisma.category.create({
        data: {
          name,
          ...(parentId ? { parentId } : {}),
          type: CategoryTypes.INVENTORY,
          children: {
            create: subCategories?.map((subCat) => ({
              name: subCat.name,
              type: CategoryTypes.INVENTORY,
            })),
          },
        },
      });
    }

    return { message: MESSAGES.CREATED };
  }

  async getInventoryCategories() {
    return await this.prisma.category.findMany({
      where: {
        type: CategoryTypes.INVENTORY,
        parent: null,
      },
      include: {
        children: true,
      },
    });
  }

  async getInventoryStats() {
    const inventoryClassCounts = await this.prisma.inventoryBatch.groupBy({
      by: ['class'],
      _count: {
        class: true,
      },
    });

    const transformedClassCounts = inventoryClassCounts.map((item) => ({
      inventoryClass: item.class,
      count: item._count.class,
    }));

    const totalInventoryCount = await this.prisma.inventoryBatch.count();

    const deletedInventoryCount = await this.prisma.inventoryBatch.count({
      where: {
        deletedAt: {
          not: null,
        },
      },
    });

    return {
      inventoryClassCounts: transformedClassCounts,
      totalInventoryCount,
      deletedInventoryCount,
    };
  }

  async getInventoryTabs(inventoryBatchId: string) {
    const inventoryBatch = await this.prisma.inventoryBatch.findUnique({
      where: { id: inventoryBatchId },
      include: {
        inventory: true,
      },
    });

    if (!inventoryBatch) {
      throw new NotFoundException(MESSAGES.BATCH_NOT_FOUND);
    }

    const tabs = [
      {
        name: 'Details',
        url: `/inventory/batch/${inventoryBatchId}`,
      },
      {
        name: 'History',
        url: `/inventory/${inventoryBatchId}/history`,
      },
      {
        name: 'Stats',
        url: `/inventory/${inventoryBatchId}/stats`,
      },
    ];

    return tabs;
  }

  private generateBatchNumber(): number {
    return Math.floor(10000000 + Math.random() * 90000000);
  }
}
