import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../application/auth-user';
import {
  BOOKING_SERVICE,
  type BookingService,
} from '../../service/booking/booking.service.interface';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import { PushNotificationService } from '../../service/notification/push-notification.service';
import {
  BookingResponseDto,
  CancelBookingDto,
  CreateBookingDto,
  QueryBookingsDto,
  UpdateBookingDto,
} from './booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(
    @Inject(BOOKING_SERVICE) private readonly bookingsService: BookingService,
    @Inject(PushNotificationService)
    private readonly notifications: PushNotificationService,
  ) {}

  @Post()
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({
    summary: 'Book the studio for a customer (manager/owner)',
  })
  @ApiOkResponse({ type: BookingResponseDto })
  async create(@Body() dto: CreateBookingDto, @CurrentUser() actor: AuthUser) {
    const booking = await this.bookingsService.create(dto, actor);
    await this.notifications.notifyManagers(
      'New booking',
      `${booking.serviceType} booking for ${booking.eventDate}`,
      {
        type: 'new_booking',
        bookingId: booking.id,
        route: `/bookings/${booking.id}`,
      },
    );
    return booking;
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.PHOTOGRAPHER)
  @ApiOperation({ summary: 'List bookings with filters and pagination' })
  findAll(@Query() query: QueryBookingsDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Get one booking by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: BookingResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({
    summary: 'Edit or reschedule a pending/confirmed booking (manager/owner)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: BookingResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.update(id, dto, actor);
  }

  @Post(':id/confirm')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a pending booking (manager/owner)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: BookingResponseDto })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.confirm(id, actor);
  }

  @Post(':id/complete')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a confirmed booking completed — the event happened',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: BookingResponseDto })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.complete(id, actor);
  }

  @Post(':id/cancel')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking with a reason (never deleted)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: BookingResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bookingsService.cancel(id, dto.reason, actor);
  }
}
