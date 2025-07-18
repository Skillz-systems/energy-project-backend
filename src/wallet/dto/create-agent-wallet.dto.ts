import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateAgentWalletDto {
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  surname: string;

  @IsString()
  @IsOptional()
  account_name?: string; // Optional - will default to firstname + surname

  @IsString()
  @Matches(/^234[0-9]{10}$/, {
    message: 'Phone must be valid Nigerian number starting with 234',
  })
  phone: string; // Must be Nigerian format: 2348xxxxxxxxx

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsString()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Date of birth must be in DD/MM/YYYY format',
  })
  dob: string; // Format: DD/MM/YYYY (e.g., "05/09/1999")

  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @IsNumberString({}, { message: 'BVN must contain only numbers' })
  bvn: string; // 11-digit BVN
}
