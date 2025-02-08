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
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { CreateDeviceDto } from './dto/create-device.dto';
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
        .addFileTypeValidator({ fileType: /(csv|xlsx)$/i })
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
