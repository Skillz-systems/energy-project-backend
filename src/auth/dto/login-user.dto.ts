import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDTO {
  @ApiProperty({
    example: 'francisalexander000@gmail.com',
    required: true,
    description: 'Email of user.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '12345678',
    required: true,
    description: 'Password of user.',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

