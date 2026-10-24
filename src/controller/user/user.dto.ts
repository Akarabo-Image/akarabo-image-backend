import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '../../util/roles';

export class CreateUserDto {
  @ApiProperty({ example: 'Akarabo Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: 'manager@akarabo.rw' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '+250788123456', required: false })
  @IsOptional()
  @Matches(/^\+?[0-9][0-9\s-]{6,19}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @ApiProperty({ example: 'S3cret!Pass', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: Role, example: Role.MANAGER })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** All fields optional; same validation rules as creation. */
export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class QueryUsersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** Free-text search across fullName / email / phone. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Akarabo Manager' })
  fullName: string;

  @ApiProperty({ example: 'manager@akarabo.rw' })
  email: string;

  @ApiProperty({ example: '+250788123456', nullable: true })
  phone?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
