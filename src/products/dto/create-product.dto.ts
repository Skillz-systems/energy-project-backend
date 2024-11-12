import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @ApiPropertyOptional({ description: 'Name of the product' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional description of the product' })
  description?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional URL for the product image', type: 'file' })
  productImage?: string;

  @IsString()
  @ApiPropertyOptional({ description: 'Price of the product' })
  price: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ default: 'NGN', description: 'Currency of the product' })
  currency?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional payment modes for the product' })
  paymentModes?: string;

  @IsString()
  @ApiPropertyOptional({ description: 'Product category Id of the product' })
  categoryId: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'An array of inventory batch IDs associated with the product',
    type: String,
  })
  inventoryBatchIds: string;
}
