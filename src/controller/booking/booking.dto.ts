import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
  Matches,
} from 'class-validator';
import {
  BookingServiceType,
  BookingStatus,
} from '../../application/booking/booking';

const CALENDAR_DAY = {
  regex: /^\d{4}-\d{2}-\d{2}$/,
  message: 'must be a real calendar day in yyyy-mm-dd form',
} as const;

export class CreateBookingDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Customer the day is booked for',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: BookingServiceType })
  @IsEnum(BookingServiceType)
  serviceType: BookingServiceType;

  @ApiProperty({
    example: '2026-06-20',
    description: 'Event day — a real calendar day, today or later',
    ...CALENDAR_DAY,
  })
  @Matches(CALENDAR_DAY.regex, { message: `eventDate ${CALENDAR_DAY.message}` })
  eventDate: string;

  @ApiPropertyOptional({
    example: '10:00',
    description: 'Optional start time, 24-hour HH:MM',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be a 24-hour time in HH:MM form',
  })
  startTime?: string;

  @ApiProperty({ example: 'Kigali Convention Centre' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  venue: string;

  @ApiPropertyOptional({ example: 250, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  expectedGuests?: number;

  @ApiProperty({
    example: 1_200_000,
    minimum: 0.01,
    description: 'Total agreed package price (money owed, not received)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000_000)
  priceAmount: number;

  @ApiPropertyOptional({ example: 'RWF', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  priceCurrency?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ enum: BookingServiceType })
  @IsOptional()
  @IsEnum(BookingServiceType)
  serviceType?: BookingServiceType;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Reschedule target — a real calendar day, today or later',
    ...CALENDAR_DAY,
  })
  @IsOptional()
  @Matches(CALENDAR_DAY.regex, { message: `eventDate ${CALENDAR_DAY.message}` })
  eventDate?: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be a 24-hour time in HH:MM form',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: 'Kigali Convention Centre' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  venue?: string;

  @ApiPropertyOptional({ example: 250, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  expectedGuests?: number;

  @ApiPropertyOptional({ example: 1_200_000, minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000_000)
  priceAmount?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelBookingDto {
  @ApiProperty({
    example: 'Family moved the event abroad',
    description: 'Why this booking is being cancelled — required, kept forever',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class QueryBookingsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number = 20;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: BookingServiceType })
  @IsOptional()
  @IsEnum(BookingServiceType)
  serviceType?: BookingServiceType;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Earliest event day (inclusive, yyyy-mm-dd)',
    ...CALENDAR_DAY,
  })
  @IsOptional()
  @Matches(CALENDAR_DAY.regex, { message: `eventFrom ${CALENDAR_DAY.message}` })
  eventFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Latest event day (inclusive, yyyy-mm-dd)',
    ...CALENDAR_DAY,
  })
  @IsOptional()
  @Matches(CALENDAR_DAY.regex, { message: `eventTo ${CALENDAR_DAY.message}` })
  eventTo?: string;
}

export class BookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({ enum: BookingServiceType })
  serviceType: BookingServiceType;

  @ApiProperty({ example: '2026-06-20', description: 'ISO yyyy-mm-dd' })
  eventDate: string;

  @ApiProperty({ example: '10:00', nullable: true })
  startTime?: string;

  @ApiProperty({ example: 'Kigali Convention Centre' })
  venue: string;

  @ApiProperty({ nullable: true })
  expectedGuests?: number;

  @ApiProperty({ example: 1_200_000 })
  priceAmount: number;

  @ApiProperty({ example: 'RWF' })
  priceCurrency: string;

  @ApiProperty({ nullable: true })
  notes?: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ format: 'uuid' })
  createdByUserId: string;

  @ApiProperty({ nullable: true })
  confirmedAt?: Date;

  @ApiProperty({ nullable: true })
  completedAt?: Date;

  @ApiProperty({ nullable: true })
  cancelledAt?: Date;

  @ApiProperty({ format: 'uuid', nullable: true })
  cancelledByUserId?: string;

  @ApiProperty({ nullable: true })
  cancellationReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
