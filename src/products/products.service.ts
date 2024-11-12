import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { MESSAGES } from 'src/constants';
import { CreateProductCategoryDto } from './dto/create-category.dto';

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

  async create(createProductDto: CreateProductDto, file: Express.Multer.File) {
    const { name, description, price, currency, paymentModes, categoryId } =
      createProductDto;

    const inventoryBatchIds: string | string[] =
      createProductDto.inventoryBatchIds;

    // Ensure inventoryBatchIds is an array
    const batchIds = Array.isArray(inventoryBatchIds)
      ? inventoryBatchIds
      : inventoryBatchIds.split(',').map((id) => id.trim());

    const image = (await this.uploadInventoryImage(file)).secure_url;

    const product = await this.prisma.product.create({
      data: {
        name,
        description,
        image,
        price,
        currency,
        paymentModes,
        categoryId,
      },
    });

    if (inventoryBatchIds?.length) {
      // Create many-to-many links in the ProductInventoryBatch table
      await this.prisma.productInventoryBatch.createMany({
        data: batchIds.map((inventoryBatchId) => ({
          productId: product.id,
          inventoryBatchId,
        })),
      });
    }

    return product;
  }

  async getAllProducts(getProductsDto: GetProductsDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      createdAt,
      updatedAt,
    } = getProductsDto;

    const whereConditions: any = {};

    // Apply filtering conditions
    if (categoryId) whereConditions.productCategoryId = categoryId;
    if (createdAt) whereConditions.createdAt = { gte: new Date(createdAt) };
    if (updatedAt) whereConditions.updatedAt = { gte: new Date(updatedAt) };

    const skip = (page - 1) * limit;

    // Fetch products with pagination and filters
    const products = await this.prisma.product.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        // inventoryBatches: {
        //   include: {
        //     inventoryBatch: true,
        //   },
        // },
        category: true,
      },
    });

    const total = await this.prisma.product.count({
      where: whereConditions,
    });

    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  async createProductCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const { name, parentId } = createProductCategoryDto;

    // Check if the parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    return this.prisma.category.create({
      data: {
        name,
        parentId,
        type: 'PRODUCT',
      },
    });
  }

  async getAllCategories() {
    return await this.prisma.category.findMany({
      where: {
        type: 'PRODUCT',
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
        inventoryBatches: {
          include: {
            inventoryBatch: true,
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
      allProducts
    }
  }
}
