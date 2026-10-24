import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  ExpenseStatus,
} from '../../application/expense/expense';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.TRANSPORT })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({
    example: 20000,
    minimum: 0.01,
    description: 'Amount spent, in the expense currency',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000_000)
  amount: number;

  @ApiPropertyOptional({ example: 'RWF', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({
    example: 'Fuel to a wedding shoot in Musanze',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'When the expense was incurred (defaults to now, ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expenseDate?: Date;
}

export class ReverseExpenseDto {
  @ApiProperty({
    example: 'Entered twice by mistake',
    description: 'Why this record is being reversed — required, kept forever',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class QueryExpensesDto {
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

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    description: 'Only expenses recorded at/after this instant (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Only expenses recorded at/before this instant (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}

export class ExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ExpenseCategory })
  category: ExpenseCategory;

  @ApiProperty({ example: 20000 })
  amount: number;

  @ApiProperty({ example: 'RWF' })
  currency: string;

  @ApiProperty({ example: 'Fuel to a wedding shoot in Musanze' })
  description: string;

  @ApiProperty()
  expenseDate: Date;

  @ApiProperty({ enum: ExpenseStatus })
  status: ExpenseStatus;

  @ApiProperty({ format: 'uuid' })
  recordedByUserId: string;

  @ApiProperty({ nullable: true })
  reversedAt?: Date;

  @ApiProperty({ format: 'uuid', nullable: true })
  reversedByUserId?: string;

  @ApiProperty({ nullable: true })
  reversalReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
