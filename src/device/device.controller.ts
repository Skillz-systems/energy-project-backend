import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFile,
  HttpStatus,
  ParseFilePipeBuilder,
  HttpCode,
  UseInterceptors,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import {
  CreateBatchDeviceTokensDto,
  CreateDeviceDto,
} from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RolesAndPermissionsGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActionEnum, SubjectEnum } from '@prisma/client';
import { RolesAndPermissions } from '../auth/decorators/roles.decorator';
import { unlinkSync } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ListDevicesQueryDto } from './dto/list-devices.dto';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@ApiTags('Devices')
@Controller('device')
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
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './files',
      }),
    }),
  )
  @Post('batch-upload')
  async createBatchDevices(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^(text\/csv)$/i })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ) {
    const filePath = file.path;
    const upload = await this.deviceService.uploadBatchDevices(filePath);
    unlinkSync(filePath);

    return upload;
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @ApiBody({
    type: CreateBatchDeviceTokensDto,
    description: 'Json structure for request payload',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './files',
      }),
    }),
  )
  @Post('batch/generate-tokens')
  async createBatchDeviceTokens(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['.csv'];

    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedTypes.includes(fileExtension)) {
      throw new BadRequestException('Only CSV files are allowed (.csv)');
    }

    const filePath = file.path;
    try {
      const upload = await this.deviceService.createBatchDeviceTokens(filePath);
      return upload;
    } finally {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.warn('Failed to delete uploaded file:', error);
      }
    }
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @ApiParam({
    name: 'deviceId',
    type: String,
    description: 'Device ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tokenDuration: {
          type: 'number',
          description: 'Token duration in days (-1 for forever token)',
          example: 30,
        },
      },
      required: ['tokenDuration'],
    },
  })
  @Post(':deviceId/generate-token')
  async generateSingleDeviceToken(
    @Param('deviceId') deviceId: string,
    @Body() body: { tokenDuration: number },
  ) {
    const { tokenDuration } = body;

    if (tokenDuration === undefined || tokenDuration === null) {
      throw new BadRequestException('Token duration is required');
    }

    return await this.deviceService.generateSingleDeviceToken(
      deviceId,
      tokenDuration,
    );
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @ApiBody({
    type: CreateDeviceDto,
    description: 'Json structure for request payload',
  })
  @ApiOperation({ summary: 'Create a single device' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createDevice(@Body() createDeviceDto: CreateDeviceDto) {
    return await this.deviceService.createDevice(createDeviceDto);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch all devices' })
  @ApiExtraModels(ListDevicesQueryDto)
  @Get()
  async fetchDevices(@Query() query: ListDevicesQueryDto) {
    return await this.deviceService.fetchDevices(query);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @ApiParam({
    name: 'id',
    description: 'Device id to fetch details',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single device by ID' })
  @Get(':id')
  async fetchDevice(@Param('id') id: string) {
    return await this.deviceService.validateDeviceExistsAndReturn({ id });
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'Device id to update details',
  })
  @ApiBody({
    type: UpdateDeviceDto,
    description: 'Json structure for request payload',
  })
  @ApiOperation({ summary: 'Update a device by ID' })
  @Patch(':id')
  async updateDevice(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return await this.deviceService.updateDevice(id, updateDeviceDto);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Sales}`],
  })
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'Device id to delete details',
  })
  @ApiOperation({ summary: 'Soft delete a device by ID' })
  @Delete(':id')
  async deleteDevice(@Param('id') id: string) {
    return await this.deviceService.deleteDevice(id);
  }
}
