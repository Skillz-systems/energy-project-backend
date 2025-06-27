import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Serial number of the device' })
  @IsString()
  @MinLength(2)
  serialNumber: string;

  @ApiProperty({ description: 'Key associated with the device' })
  @IsString()
  @MinLength(2)
  key: string;

  @ApiProperty({ description: 'Optional starting code', required: false })
  @IsString()
  @MinLength(2)
  @IsOptional()
  startingCode?: string;

  @ApiProperty({ description: 'Optional count', required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  count?: string;

  @ApiProperty({ description: 'Optional time divider', required: false })
  @IsString()
  @IsOptional()
  timeDivider?: string;

  @ApiProperty({ description: 'Restricted digit mode', default: false })
  @IsBoolean()
  @IsOptional()
  restrictedDigitMode?: boolean;

  @ApiProperty({ description: 'Optional hardware model', required: false })
  @IsString()
  @MinLength(2)
  @IsOptional()
  hardwareModel?: string;

  @ApiProperty({ description: 'Optional firmware version', required: false })
  @IsString()
  @MinLength(2)
  @IsOptional()
  firmwareVersion?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Whether the device is tokenable or not',
    example: true,
  })
  isTokenable?: boolean;
}


export class CreateBatchDeviceTokensDto {
  @ApiProperty({ type: 'file' })
  file: Express.Multer.File;
}
