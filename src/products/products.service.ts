import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';


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
}
