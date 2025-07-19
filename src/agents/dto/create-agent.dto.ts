import { IsString, IsOptional, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { AgentCategory } from '@prisma/client';

export class CreateAgentDto extends OmitType(CreateUserDto, ['role']) {
  @ApiPropertyOptional({
    example: '1234 Street',
    description: 'Longitude of the location of the agent',
  })
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiPropertyOptional({
    example: '1234 Street',
    description: 'Latitude of the location of the agent',
  })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiProperty({ description: 'agent category', enum: AgentCategory })
  @IsEnum(AgentCategory)
  category?: AgentCategory;
}
