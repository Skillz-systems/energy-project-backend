import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../utils/dto/pagination.dto';

export class ListSalesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: 'CASH',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
