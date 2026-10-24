import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'owner@akarabo.rw' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cret!Pass' })
  @IsString()
  @MinLength(8)
  password: string;
}
