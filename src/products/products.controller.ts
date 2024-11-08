import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, ParseFilePipeBuilder, UploadedFile, UseInterceptors, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiExtraModels, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RolesAndPermissions } from 'src/auth/decorators/roles.decorator';
import { ActionEnum, SubjectEnum } from '@prisma/client';
import { RolesAndPermissionsGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetProductsDto } from './dto/get-products.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Products}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @ApiBody({
    type: CreateProductDto,
    description: 'Json structure for request payload',
  })
  @ApiBadRequestResponse({})
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @Post()

  @UseInterceptors(FileInterceptor('productImage'))
  async create(
    @Body() CreateProductDto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpeg|jpg|png|svg)$/i })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return await this.productsService.create(
      CreateProductDto,
      file,
    );
  }

  // @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  // @RolesAndPermissions({
  //   permissions: [`${ActionEnum.manage}:${SubjectEnum.Products}`],
  // })
  // @ApiBearerAuth('access_token')
  // @ApiHeader({
  //   name: 'Authorization',
  //   description: 'JWT token used for authentication',
  //   required: true,
  //   schema: {
  //     type: 'string',
  //     example: 'Bearer <token>',
  //   },
  // })
  @Get()
  @ApiOkResponse({
    description: 'Fetch all products with pagination',
    isArray: true,
  })
  @ApiBadRequestResponse({})
  @ApiExtraModels(GetProductsDto)
  @HttpCode(HttpStatus.OK)
  async getAllProducts(@Query() getProductsDto: GetProductsDto) {
    return this.productsService.getAllProducts(getProductsDto);
  }
}
