import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, ValidateNested } from 'class-validator';
import { IDType } from '@prisma/client';
import { Type } from 'class-transformer';

export class IdentificationDto {
  @ApiProperty({
    description: 'Type of identification',
    enum: IDType,
    example: IDType.Nin,
  })
  @IsEnum(IDType)
  idType: IDType;

  @ApiProperty({
    description: 'Unique number on the identification document',
    example: '123456789',
  })
  @IsString()
  idNumber: string;

  @ApiProperty({
    description: 'Country or authority that issued the identification document',
    example: 'Nigeria',
  })
  @IsString()
  issuingCountry: string;

  @ApiProperty({
    description: 'Issue date of the identification document (optional)',
    example: '1990-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({
    description: 'Expiration date of the identification document (optional)',
    example: '1990-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiProperty({
    description: 'Full name as shown on the identification document',
    example: 'John Doe',
  })
  @IsString()
  fullNameAsOnID: string;

  @ApiProperty({
    description: 'Address as shown on the identification document (optional)',
    example: '456 Elm Street, Abuja, Nigeria',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressAsOnID?: string;
}

export class NextOfKinDto {
  @ApiProperty({
    description: 'The full name of the next of kin',
    example: 'Jane Doe',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'Relationship between the user and the next of kin',
    example: 'Mother',
  })
  @IsString()
  relationship: string;

  @ApiProperty({
    description: 'Phone number of the next of kin',
    example: '+2341234567890',
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address of the next of kin (optional)',
    example: 'jane.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Home address of the next of kin (optional)',
    example: '123 Main Street, Lagos, Nigeria',
    required: false,
  })
  @IsOptional()
  @IsString()
  homeAddress: string;

  @ApiProperty({
    description: 'Date of birth of the next of kin (optional)',
    example: '1990-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Nationality of the next of kin (optional)',
    example: 'Nigeria',
    required: false,
  })
  @IsOptional()
  @IsString()
  nationality?: string;
}

export class GuarantorDto {
  @ApiProperty({
    description: 'The full name of the guarantor',
    example: 'John Smith',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'Phone number of the guarantor',
    example: '+2349876543210',
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Email address of the guarantor (optional)',
    example: 'john.smith@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Home address of the guarantor',
    example: '789 Oak Avenue, Abuja, Nigeria',
  })
  @IsString()
  homeAddress: string;

  @ApiProperty({
    description: 'Optional gurantor identification details for customer.',
    type: IdentificationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificationDto)
  identificationDetails?: IdentificationDto;

  @ApiProperty({
    description: 'Date of birth of the guarantor (optional)',
    example: '1990-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Nationality of the guarantor (optional)',
    example: 'Nigeria',
    required: false,
  })
  @IsOptional()
  @IsString()
  nationality?: string;
}
