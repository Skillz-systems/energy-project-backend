import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PasswordMatches } from '../../auth/customValidators/passwordMatches';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDTO {
  @ApiProperty({
    example: 'f9c2f4ef-6bfa-4434-9554-72774e507e1e',
    required: true,
    description: 'Valid reset token',
  })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({
    example: 'beoioh0e202i/dlj',
    required: true,
    description: 'Valid new password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    example: 'beoioh0e202i/dlj',
    required: true,
    description: 'New password confirmation',
  })
  @IsString()
  @IsNotEmpty()
  @PasswordMatches('newPassword')
  confirmNewPassword: string;
}
