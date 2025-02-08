import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RolesAndPermissions } from '../auth/decorators/roles.decorator';
import { ActionEnum, SubjectEnum } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from '../auth/guards/roles.guard';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiBody({
    type: CreatePermissionDto,
    description: 'Data for creating a new permission',
    examples: {
      example1: {
        summary: 'Valid input',
        value: {
          action: 'create',
          subject: 'user',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The permission has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
    type: BadRequestException,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }


  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Get()
  @ApiOperation({ summary: 'Retrieve all permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of all permissions.',
  })
  findAll() {
    return this.permissionsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Get('subjects')
  @ApiOperation({ summary: 'Retrieve all permission subjects' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a list of all permission subjects.',
  })
  findAllPermissionSubjects() {
    return this.permissionsService.findAllPermissionSubjects();
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific permission by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the permission to retrieve',
    type: String,
    example: '66f42a3166aaf6fbb2a643bf',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the permission with the specified ID.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found.',
    type: NotFoundException,
  })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific permission by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the permission to update',
    type: String,
    example: '66f42a3166aaf6fbb2a643bf',
  })
  @ApiBody({
    type: UpdatePermissionDto,
    description: 'Data for updating the permission',
    examples: {
      example1: {
        summary: 'Valid update data',
        value: {
          action: 'update',
          subject: 'user',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The permission has been updated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found.',
    type: NotFoundException,
  })
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [
      `${ActionEnum.manage}:${SubjectEnum.User}`,
    ],
  })
  @ApiBearerAuth('access_token')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific permission by ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the permission to delete',
    type: String,
    example: '66f42a3166aaf6fbb2a643bf',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The permission has been deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found.',
    type: NotFoundException,
  })
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
