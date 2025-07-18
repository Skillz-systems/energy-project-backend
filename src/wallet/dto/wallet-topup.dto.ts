import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';

export class WalletTopUpDto {
  @ApiProperty({ description: 'Amount to top up', minimum: 100, example: 500 })
  @IsNumber()
  @IsPositive()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ description: 'Optional description for the top-up' })
  @IsString()
  @IsOptional()
  description?: string;
}
