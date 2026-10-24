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
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../application/payment/payment';

export class CreatePaymentDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Booking this payment belongs to (available once the Booking module ships)',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Studio service record this payment belongs to' })
  @IsOptional()
  @IsUUID()
  studioServiceId?: string;

  @ApiProperty({
    example: 150000,
    minimum: 0.01,
    description: 'Amount received, in the payment currency',
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

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOBILE_MONEY })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    example: 'MP240115.1234.A1234',
    description: 'Receipt / mobile-money transaction id — must be unique',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ReversePaymentDto {
  @ApiProperty({
    example: 'Cash counted twice at handover',
    description: 'Why this record is being reversed — required, kept forever',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class QueryPaymentsDto {
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

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Only payments recorded at/after this instant (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Only payments recorded at/before this instant (ISO 8601)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  bookingId?: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  studioServiceId?: string;

  @ApiProperty({ example: 150000 })
  amount: number;

  @ApiProperty({ example: 'RWF' })
  currency: string;

  @ApiProperty({ enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ example: 'MP240115.1234.A1234', nullable: true })
  reference?: string;

  @ApiProperty({ nullable: true })
  notes?: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

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
