import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { StudioServiceStatus } from '../../persistence/studio-service/studio-service.entity';
import { PhotographerTaskStatus } from '../../persistence/photographer-task/photographer-task.entity';

export class CreateStudioServiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsDateString({ strict: true })
  serviceDate: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  photosTaken: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  softPhotos: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  hardPhotos: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  needsUrgentService?: boolean;
}

export class CreatePhotographerWorkDto {
  @ApiProperty({ example: '2026-10-23' })
  @IsDateString({ strict: true })
  workDate: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  editedPhotos: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class StudioReportQueryDto {
  @ApiProperty({ example: '2026-10-23' })
  @IsDateString({ strict: true })
  from: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsDateString({ strict: true })
  to: string;
}

export class UpdateStudioServiceStatusDto {
  @ApiProperty({ enum: StudioServiceStatus })
  @IsEnum(StudioServiceStatus)
  status: StudioServiceStatus;
}

export class UpdateStudioServicePriorityDto {
  @ApiProperty()
  @IsBoolean()
  needsUrgentService: boolean;
}

export class CreatePhotographerTaskDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studioServiceId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  photographerUserId: string;

  @ApiProperty({ example: '2026-10-24' })
  @IsDateString({ strict: true })
  taskDate: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(100000)
  photosToEdit: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdatePhotographerTaskDto {
  @ApiProperty({ enum: PhotographerTaskStatus })
  @IsEnum(PhotographerTaskStatus)
  status: PhotographerTaskStatus;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  editedPhotos?: number;
}
