import { IsOptional, IsString, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class GetAgentsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  limit?: string;
  
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  @IsEnum(UserStatus)
  status?: UserStatus;

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
}
