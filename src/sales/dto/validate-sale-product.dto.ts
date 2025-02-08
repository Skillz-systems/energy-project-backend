import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class ValidateSaleProductItemDto {
  @ApiProperty({
    description: 'Product ID linked to the sale item.',
    example: '507f191e810c19729de860ea',
  })
  @IsNotEmpty()
  @IsString()
  @IsObjectId({
    message: 'Invalid Id',
  })
  productId: string;

  @ApiProperty({
    description: 'Quantity',
    example: '100',
  })
  @IsNumber()
  @Transform(({ value }) => {
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      throw new BadRequestException(
        'Quantity of sale product item must be a valid number.',
      );
    }
    return parsedValue;
  })
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

export class ValidateSaleProductDto {
  @ApiProperty({
    description:
      'An array of product items to be validated againt inventory quantities',
    type: [ValidateSaleProductItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateSaleProductItemDto)
  productItems: ValidateSaleProductItemDto[];
}
