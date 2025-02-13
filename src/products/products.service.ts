import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { MESSAGES } from '../constants';
import { CreateProductCategoryDto } from './dto/create-category.dto';
import { CategoryTypes, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { CategoryEntity } from 'src/utils/entity/category';

@Injectable()
export class ProductsService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadInventoryImage(file: Express.Multer.File) {
    return await this.cloudinary.uploadFile(file).catch((e) => {
      throw e;
    });
  }

  async create(
    createProductDto: CreateProductDto,
    file: Express.Multer.File,
    creatorId: string,
  ) {
    const {
      name,
      description,
      currency,
      paymentModes,
      categoryId,
      inventories,
    } = createProductDto;

    const isCategoryValid = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        type: CategoryTypes.PRODUCT,
      },
    });

    if (!isCategoryValid) {
      throw new BadRequestException('Invalid Product Category');
    }

    const productInventoryIds = inventories?.map((ivt) => ivt.inventoryId);

    if (productInventoryIds.length === 0) {
      throw new BadRequestException('No inventory IDs provided.');
    }

    // Find all inventories from the DB
    const inventoriesFromDb = await this.prisma.inventory.findMany({
      where: {
        id: {
          in: productInventoryIds,
        },
      },
      select: {
        id: true,
      },
    });

    // Find invalid inventory IDs by comparing with existing DB records
    const validInventoryIds = new Set(
      inventoriesFromDb.map((inventory) => inventory.id),
    );
    const invalidInventoryIds = productInventoryIds.filter(
      (id) => !validInventoryIds.has(id),
    );

    if (invalidInventoryIds.length > 0) {
      throw new BadRequestException(
        `Invalid inventory IDs: ${invalidInventoryIds.join(', ')}`,
      );
    }

    const image = (await this.uploadInventoryImage(file)).secure_url;

    const product = await this.prisma.product.create({
      data: {
        name,
        description,
        image,
        currency,
        paymentModes,
        categoryId,
        creatorId,
      },
    });

    await this.prisma.productInventory.createMany({
      data: inventories?.map(({ inventoryId, quantity }) => ({
        productId: product.id,
        inventoryId,
        quantity,
      })),
    });

    return product;
  }

  async getAllProducts(getProductsDto: GetProductsDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      createdAt,
      updatedAt,
      sortField,
      sortOrder,
      search,
    } = getProductsDto;

    const whereConditions: Prisma.ProductWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        categoryId ? { categoryId } : {},
        createdAt ? { createdAt: { gte: new Date(createdAt) } } : {},
        updatedAt ? { updatedAt: { gte: new Date(updatedAt) } } : {},
      ],
    };

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const orderBy = sortField
      ? {
          [sortField]: sortOrder || 'asc',
        }
      : undefined;

    // Fetch products with pagination and filters
    const result = await this.prisma.product.findMany({
      where: whereConditions,
      skip,
      take,
      orderBy,
      include: {
        category: true,
        creatorDetails: true,
        inventories: {
          include: {
            inventory: {
              include: { batches: true },
            },
          },
        },
      },
    });

    const updatedResults = result.map(this.mapProductToResponseDto);

    const total = await this.prisma.product.count({
      where: whereConditions,
    });

    return {
      updatedResults,
      total,
      page,
      totalPages: limit === 0 ? 0 : Math.ceil(total / limit),
      limit,
    };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        creatorDetails: true,
        inventories: {
          include: {
            inventory: {
              include: { batches: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    }

    return this.mapProductToResponseDto(product);
  }

  async createProductCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const { name } = createProductCategoryDto;

    const categoryExists = await this.prisma.category.findFirst({
      where: {
        name,
        type: CategoryTypes.PRODUCT,
      },
    });

    if (categoryExists) {
      throw new ConflictException(
        `A product category with this name: ${name} already exists`,
      );
    }

    return this.prisma.category.create({
      data: {
        name,
        type: CategoryTypes.PRODUCT,
      },
    });
  }

  async getAllCategories() {
    return await this.prisma.category.findMany({
      where: {
        type: CategoryTypes.PRODUCT,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async getProductTabs(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        _count: {
          select: { customers: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    }

    const tabs = [
      {
        name: 'Product Details',
        url: `/product/${productId}/details`,
      },
      {
        name: 'Stats',
        url: `/product/${productId}/stats`,
      },
      {
        name: 'Inventory Details',
        url: `/product/${productId}/inventory`,
      },
      {
        name: 'Customers',
        url: `/product/${productId}/customers`,
        count: product._count.customers,
      },
    ];

    return tabs;
  }

  async getProductInventory(productId: string) {
    const inventoryBatch = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventories: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!inventoryBatch) {
      throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    }

    return inventoryBatch;
  }

  async getProductStatistics() {
    const allProducts = await this.prisma.product.count();

    if (!allProducts) {
      throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    }

    return {
      allProducts,
    };
  }

  private mapProductToResponseDto(
    product: Prisma.ProductGetPayload<{
      include: {
        category: true;
        creatorDetails: true;
        inventories: {
          include: {
            inventory: {
              include: {
                batches: true;
                inventoryCategory: true;
                inventorySubCategory: true;
              };
            };
          };
        };
      };
    }>,
  ) {
    const { inventories, category, ...rest } = product;
    const { maximumInventoryBatchPrice, minimumInventoryBatchPrice } =
      inventories
        .map(({ inventory }) => {
          const { batches } = inventory;
          const batchPrices = batches
            .filter(({ remainingQuantity }) => remainingQuantity > 0)
            .map((batch) => batch.price);

          return {
            minimumInventoryBatchPrice: batchPrices.length
              ? Math.min(...batchPrices)
              : 0.0,
            maximumInventoryBatchPrice: batchPrices.length
              ? Math.max(...batchPrices)
              : 0.0,
          };
        })
        .reduce(
          (prev, curr) => {
            prev.minimumInventoryBatchPrice += curr.minimumInventoryBatchPrice;
            prev.maximumInventoryBatchPrice += curr.maximumInventoryBatchPrice;
            return prev;
          },
          {
            minimumInventoryBatchPrice: 0,
            maximumInventoryBatchPrice: 0,
          },
        );

    const priceRange = `₦${minimumInventoryBatchPrice.toFixed(2)} - ₦${maximumInventoryBatchPrice.toFixed(2)}`;

    return {
      ...rest,
      inventories: inventories.map(({ inventory }) => {
        const { batches, ...rest } = inventory;

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
          totalRemainingQuantities,
          totalInitialQuantities,
        };
      }),
      category: plainToInstance(CategoryEntity, category),
      priceRange,
    };
  }
}
