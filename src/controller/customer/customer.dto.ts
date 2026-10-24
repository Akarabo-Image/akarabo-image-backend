import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Aline Uwase',
    description: 'Contact person or company name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: '+250788111222',
    description: 'Primary contact number — unique across customers',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @ApiPropertyOptional({ example: 'aline@example.rw' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: 'KG 11 Ave, Kigali' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Aline Uwase' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '+250788111222' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'aline@example.rw' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: 'KG 11 Ave, Kigali' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QueryCustomersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Only active (true) or deactivated (false) customers',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : String(value),
  )
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Free-text match against name / phone / email',
    example: 'aline',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Aline Uwase' })
  name: string;

  @ApiProperty({ example: '+250788111222' })
  phone: string;

  @ApiProperty({ nullable: true })
  email?: string;

  @ApiProperty({ nullable: true })
  address?: string;

  @ApiProperty({ nullable: true })
  notes?: string;

  @ApiProperty({
    description: 'Inactive customers cannot be new bookings — never deleted',
  })
  isActive: boolean;

  @ApiProperty({ format: 'uuid' })
  createdByUserId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
