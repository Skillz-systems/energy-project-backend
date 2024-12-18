import { IsString, IsOptional, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Name of the product' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional description of the product' })
  description?: string;

  // @IsOptional()
  // @IsString()
  // @ApiPropertyOptional({
  //   description: 'Optional URL for the product image',
  //   type: 'file',
  // })
  // productImage?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Price of the product' })
  price: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    default: 'NGN',
    description: 'Currency of the product',
  })
  currency?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'Payment modes for the product. The distinct payment modes should be concatenated together and separated by comma',
  })
  paymentModes?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Product category Id of the product' })
  categoryId: string;

  @ValidateIf((obj) => typeof obj.inventoryBatchId === 'string')
  // @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description:
      'The Inventory IDs associated with the product. Can be a single string or an array of inventoryBatchId strings.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: '12345,67890', // Example of string format
  })
  inventoryBatchId: string | string[];

  @ApiProperty({ type: 'file' })
  productImage: Express.Multer.File;
}
