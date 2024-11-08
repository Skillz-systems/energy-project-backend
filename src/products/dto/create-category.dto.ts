import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryTypes } from '@prisma/client';

export class CreateProductCategoryDto {
  @ApiProperty({ description: 'The name of the category' }) 
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'ID of the parent category' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({ description: 'Type of the category', enum: CategoryTypes })
  @IsOptional()
  @IsEnum(CategoryTypes)
  type?: CategoryTypes;
}