import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';

export class CreateFinancialMarginDto {
  @ApiProperty({
    description: 'Percentage value of the outrightMargin in float ',
    example: '0.5',
  })
  @IsNumber()
  @Transform(({ value }) => {
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      throw new BadRequestException('outrightMargin must be a valid number.');
    }
    return parsedValue;
  })
  @IsNotEmpty()
  outrightMargin: number;

  @ApiProperty({
    description: 'Percentage value of the loanMargin in float ',
    example: '0.5',
  })
  @IsNumber()
  @Transform(({ value }) => {
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      throw new BadRequestException('loanMargin must be a valid number.');
    }
    return parsedValue;
  })
  @IsNotEmpty()
  loanMargin: number;

  @ApiProperty({
    description: 'Percentage value of the monthlyInterest in float ',
    example: '0.5',
  })
  @IsNumber()
  @Transform(({ value }) => {
    const parsedValue = Number(value);
    if (isNaN(parsedValue)) {
      throw new BadRequestException('monthlyInterest must be a valid number.');
    }
    return parsedValue;
  })
  @IsNotEmpty()
  monthlyInterest: number;
}
