import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';


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

  async create(createProductDto: CreateProductDto, file: Express.Multer.File,) {
    const { name, description, price, currency, paymentModes, productCategoryId, inventoryBatchId } = createProductDto;


    const image = (await this.uploadInventoryImage(file)).secure_url;

    return await this.prisma.product.create({
      data: {
        name,
        description,
        image,
        price,
        currency,
        paymentModes,
        productCategoryId,
        inventoryBatchId,
      },
    });
  }

  async getAllProducts(getProductsDto: GetProductsDto) {
    const { page = 1, limit = 10, categoryId, createdAt, updatedAt } = getProductsDto;

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
}
