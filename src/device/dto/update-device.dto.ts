import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateDeviceDto {
  @ApiProperty({ description: 'Serial number of the device', required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({
    description: 'Key associated with the device',
    required: false,
  })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ description: 'Optional starting code', required: false })
  @IsString()
  @IsOptional()
  startingCode?: string;

  @ApiProperty({ description: 'Optional count', required: false })
  @IsString()
  @IsOptional()
  count?: string;

  @ApiProperty({ description: 'Optional time divider', required: false })
  @IsString()
  @IsOptional()
  timeDivider?: string;

  @ApiProperty({ description: 'Restricted digit mode', required: false })
  @IsBoolean()
  @IsOptional()
  restrictedDigitMode?: boolean;

  @ApiProperty({ description: 'Optional hardware model', required: false })
  @IsString()
  @IsOptional()
  hardwareModel?: string;

  @ApiProperty({ description: 'Optional firmware version', required: false })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;
}
