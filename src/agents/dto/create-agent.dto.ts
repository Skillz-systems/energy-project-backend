import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'John', description: 'First name of the agent' })
  @IsString()
  firstname: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the agent' })
  @IsString()
  lastname: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Unique email of the agent' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'home', description: 'Type of address for the agent' })
  @IsString()
  addressType: string;

  @ApiProperty({ example: '1234 Street', description: 'Address of the agent' })
  @IsString()
  location: string;

  @ApiProperty({ example: '1234 Street', description: 'Longitude of the location of the  agent' })
  @IsString()
  longitude: string;

  @ApiProperty({ example: '1234 Street', description: 'Latitude of the location of the  agent' })
  @IsString()
  latitude: string;

  @ApiProperty({ example: true, description: 'Email verification status', default: false })
  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;
}
