import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const { name } = createPermissionDto;

    // Validate if the name is already in use
    try {
      // Check if the permission name already exists
      const existingPermission = await this.prisma.permission.findUnique({
        where: { name },
      });

      if (existingPermission) {
        throw new ConflictException(`Permission with name "${name}" already exists`);
      }

      // Create a new permission
      const permission = await this.prisma.permission.create({
        data: {
          name,
        },
      });

      return permission;

    } catch (error) {
      // Handle any errors from Prisma
      if (error.code === 'P2002') { // Prisma unique constraint violation code
        throw new ConflictException('A permission with this name already exists');
      }
      throw new BadRequestException(error.message || 'Error creating permission');
    }
  }

  async findAll() {
    return this.prisma.permission.findMany();
  }

  async findOne(id: string) {
    // Validate if the id is a valid ObjectID
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }

    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    // Validate if the id is a valid ObjectID
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
  
    const { name } = updatePermissionDto;
  
    // Check if the name is unique
    if (name) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { name },
      });
  
      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException(`Permission with name "${name}" already exists`);
      }
    }
  
    const permission = await this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });
  
    if (!permission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }
  
    return permission;
  }

  async remove(id: string) {
    // Validate if the id is a valid ObjectID
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
  
    // Check if the permission exists
    const existingPermission = await this.prisma.permission.findUnique({
      where: { id },
    });
  
    if (!existingPermission) {
      throw new NotFoundException(`Permission with ID "${id}" not found`);
    }
  
    const deletedPermission = await this.prisma.permission.delete({
      where: { id },
    });
  
    return deletedPermission;
  }

  private isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }
}
