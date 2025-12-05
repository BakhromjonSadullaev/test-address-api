import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateAddressDto {
  @ApiProperty({
    description: 'Free-form address text to validate and standardize',
    example: '1600 Amphitheatre Parkway, Mountain View, CA',
    maxLength: 500,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;
}

