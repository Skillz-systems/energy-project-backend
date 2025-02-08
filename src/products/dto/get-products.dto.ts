import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetProductsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of products per page',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by creation date (ISO format)' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Filter by last update date (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @ApiPropertyOptional({
    description: 'Search product by name, description',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({
    description: 'Sort order (asc or desc)',
    enum: ['asc', 'desc'],
    example: '',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
