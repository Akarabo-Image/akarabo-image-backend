import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiProperty({ maxLength: 200 })
  @IsEmail()
  @MaxLength(200)
  email: string;

  @ApiProperty({ example: 'Wedding', maxLength: 40 })
  @IsString()
  @Length(2, 40)
  service: string;

  @ApiPropertyOptional({ example: '2026-12-14' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  preferredDate?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
