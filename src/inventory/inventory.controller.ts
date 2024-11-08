import { SkipThrottle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RolesAndPermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from '../auth/guards/roles.guard';
import { ActionEnum, SubjectEnum } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FetchInventoryQueryDto } from './dto/fetch-inventory.dto';
import { CreateCategoryArrayDto } from './dto/create-category.dto';

@SkipThrottle()
@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
    type: CreateInventoryDto,
    description: 'Json structure for request payload',
  })
  @ApiBadRequestResponse({})
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  @UseInterceptors(FileInterceptor('inventoryImage'))
  async create(
    @Body() createInventoryDto: CreateInventoryDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpeg|jpg|png|svg)$/i })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    return await this.inventoryService.createInventory(
      createInventoryDto,
      file,
    );
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @Get('')
  @ApiOkResponse({
    description: 'Fetch all inventory with pagination',
    isArray: true,
  })
  @ApiBadRequestResponse({})
  @ApiExtraModels(FetchInventoryQueryDto)
  @HttpCode(HttpStatus.OK)
  async getInventories(@Query() query: FetchInventoryQueryDto) {
    return await this.inventoryService.getInventories(query);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @ApiParam({
    name: 'id',
    description: 'InventoryBatch id to fetch details',
  })
  @Get('batch/:id')
  @ApiOperation({
    summary: 'Fetch Inventory Batch details',
    description:
      'This endpoint allows a permitted user fetch an inventory batch details.',
  })
  @ApiBearerAuth('access_token')
  @ApiOkResponse({})
  @HttpCode(HttpStatus.OK)
  async getInventoryBatchDetails(@Param('id') id: string) {
    return await this.inventoryService.fetchInventoryBatchDetails(id);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @ApiBearerAuth('access_token')
  @ApiBody({
    type: CreateCategoryArrayDto,
    description: 'Category creation payload',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('category/create')
  @ApiOperation({
    summary: 'Create Inventory Category',
    description:
      'This endpoint allows a permitted user Create an Inventory Category',
  })
  @ApiOkResponse({})
  async createInventoryCategory(
    @Body() createCategoryArrayDto: CreateCategoryArrayDto,
  ) {
    return await this.inventoryService.createInventoryCategory(
      createCategoryArrayDto.categories,
    );
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @Get('categories')
  @ApiOkResponse({
    description: 'Fetch all inventory categories',
    isArray: true,
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.OK)
  async getInventoryCategories() {
    return await this.inventoryService.getInventoryCategories();
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @Get('stats')
  @ApiOkResponse({
    description: 'Fetch Inventory Statistics',
    isArray: true,
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.OK)
  async getInventoryStats() {
    return await this.inventoryService.getInventoryStats();
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Inventory}`],
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
  @ApiParam({
    name: 'id',
    description: 'InventoryBatch id to fetch tabs',
  })
  @ApiOkResponse({
    description: 'Fetch Inventory Tabs',
    isArray: true,
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.OK)
  @Get(':id/tabs')
  async getInventoryTabs(@Param('id') inventoryBatchId: string) {
    return this.inventoryService.getInventoryTabs(inventoryBatchId);
  }
}
