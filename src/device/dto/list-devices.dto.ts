import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class ListDevicesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by device serialNumber',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by device startingCode',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  startingCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by device key',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Filter by device hardwareModel',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  hardwareModel?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date',
    type: String,
    format: 'date-time',
    example: '',
  })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Filter by last update date',
    type: String,
    format: 'date-time',
    example: '',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string;

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

  @ApiPropertyOptional({
    description: 'Search devices by name, email, or devicename',
    type: String,
    example: '',
  })
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiPropertyOptional({
    type: Boolean,
    example: 'true',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === '1')
  isTokenable?: boolean;
}
