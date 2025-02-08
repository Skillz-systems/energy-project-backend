import {
  BadRequestException,
  ConflictException,
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
import { CreateInventoryBatchDto } from './dto/create-inventory-batch.dto';
import { InventoryEntity } from './entity/inventory.entity';
import { plainToInstance } from 'class-transformer';
import { InventoryBatchEntity } from './entity/inventory-batch.entity';
import { CategoryEntity } from '../utils/entity/category';

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
        inventoryClass ? { class: inventoryClass as InventoryClass } : {},
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

    const inventoryData = await this.prisma.inventory.create({
      data: {
        name: createInventoryDto.name,
        manufacturerName: createInventoryDto.manufacturerName,
        dateOfManufacture: createInventoryDto.dateOfManufacture,
        sku: createInventoryDto.sku,
        image,
        class: createInventoryDto.class,
        inventoryCategoryId: createInventoryDto.inventoryCategoryId,
        inventorySubCategoryId: createInventoryDto.inventorySubCategoryId,
      },
    });

    await this.prisma.inventoryBatch.create({
      data: {
        inventoryId: inventoryData.id,
        batchNumber: Date.now() - 100,
        costOfItem: parseFloat(createInventoryDto.costOfItem),
        price: parseFloat(createInventoryDto.price),
        numberOfStock: createInventoryDto.numberOfStock,
        remainingQuantity: createInventoryDto.numberOfStock,
      },
    });

    return {
      message: MESSAGES.INVENTORY_CREATED,
    };
  }

  async createInventoryBatch(createInventoryBatchDto: CreateInventoryBatchDto) {
    const isInventoryValid = await this.prisma.inventory.findFirst({
      where: {
        id: createInventoryBatchDto.inventoryId,
      },
    });

    if (!isInventoryValid) {
      throw new BadRequestException('Invalid inventoryId');
    }

    await this.prisma.inventoryBatch.create({
      data: {
        batchNumber: Date.now() - 100,
        inventoryId: createInventoryBatchDto.inventoryId,
        costOfItem: parseFloat(createInventoryBatchDto.costOfItem),
        price: parseFloat(createInventoryBatchDto.price),
        numberOfStock: createInventoryBatchDto.numberOfStock,
        remainingQuantity: createInventoryBatchDto.numberOfStock,
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

    const updatedResults = result.map(this.mapInventoryToResponseDto);

    const totalCount = await this.prisma.inventory.count({
      where: filterConditions,
    });

    return {
      inventories: plainToInstance(InventoryEntity, updatedResults),
      total: totalCount,
      page,
      limit,
      totalPages: limitNumber === 0 ? 0 : Math.ceil(totalCount / limitNumber),
    };
  }

  async getInventory(inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        batches: true,
        inventoryCategory: true,
        inventorySubCategory: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException(MESSAGES.INVENTORY_NOT_FOUND);
    }

    return this.mapInventoryToResponseDto(inventory);
  }

  async getInventoryBatch(inventoryBatchId: string) {
    const inventorybatch = await this.prisma.inventoryBatch.findUnique({
      where: { id: inventoryBatchId },
      include: {
        inventory: true,
      },
    });

    if (!inventorybatch) {
      throw new NotFoundException(MESSAGES.BATCH_NOT_FOUND);
    }

    return plainToInstance(InventoryBatchEntity, {
      ...inventorybatch,
      inventory: plainToInstance(InventoryEntity, inventorybatch.inventory),
    });
  }

  async createInventoryCategory(categories: CreateCategoryDto[]) {
    const existingCategoryNames = [];

    for (const category of categories) {
      const { name, subCategories, parentId } = category;

      const existingCategoryByName = await this.prisma.category.findFirst({
        where: { name, type: CategoryTypes.INVENTORY },
      });

      if (existingCategoryByName) {
        throw new ConflictException(
          `An inventory category with this name: ${name} already exists`,
        );
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
    const inventoryClassCounts = await this.prisma.inventory.groupBy({
      by: ['class'],
      _count: {
        class: true,
      },
    });

    const transformedClassCounts = inventoryClassCounts.map((item) => ({
      inventoryClass: item.class,
      count: item._count.class,
    }));

    const totalInventoryCount = await this.prisma.inventory.count();

    const deletedInventoryCount = await this.prisma.inventory.count({
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

  async getInventoryTabs(inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) throw new NotFoundException(MESSAGES.INVENTORY_NOT_FOUND);

    const tabs = [
      {
        name: 'Details',
        url: `/inventory/${inventoryId}`,
      },
      {
        name: 'History',
        url: `/inventory/${inventoryId}/history`,
      },
      {
        name: 'Stats',
        url: `/inventory/${inventoryId}/stats`,
      },
    ];

    return tabs;
  }

  mapInventoryToResponseDto(
    inventory: Prisma.InventoryGetPayload<{
      include: {
        inventoryCategory: true;
        inventorySubCategory: true;
        batches: true;
      };
    }>,
  ) {
    const { batches, inventoryCategory, inventorySubCategory, ...rest } =
      inventory;
    let salePrice = '';
    if (batches.length) {
      const batchPrices = batches
        .filter(({ remainingQuantity }) => remainingQuantity > 0)
        .map((batch) => batch.price);
      const minimumInventoryBatchPrice = Math.floor(Math.min(...batchPrices));
      const maximumInventoryBatchPrice = Math.ceil(Math.max(...batchPrices));
      salePrice = `₦${minimumInventoryBatchPrice} - ₦${maximumInventoryBatchPrice}`;
    }
    const inventoryValue = batches.reduce(
      (sum, batch) => sum + batch.remainingQuantity * batch.price,
      0,
    );

    const totalRemainingQuantities = batches.reduce(
      (sum, batch) => sum + batch.remainingQuantity,
      0,
    );

    const totalInitialQuantities = batches.reduce(
      (sum, batch) => sum + batch.numberOfStock,
      0,
    );

    return {
      ...rest,
      inventoryCategory: plainToInstance(CategoryEntity, inventoryCategory),
      inventorySubCategory: plainToInstance(
        CategoryEntity,
        inventorySubCategory,
      ),
      batches: plainToInstance(InventoryBatchEntity, batches),
      salePrice,
      inventoryValue,
      totalRemainingQuantities,
      totalInitialQuantities,
    };
  }
}
