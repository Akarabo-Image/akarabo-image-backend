import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
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
  PAYMENT_SERVICE,
  type PaymentService,
} from '../../service/payment/payment.service.interface';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  QueryPaymentsDto,
  ReversePaymentDto,
} from './payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    @Inject(PAYMENT_SERVICE) private readonly paymentsService: PaymentService,
  ) {}

  @Post()
  @Roles(Role.MANAGER, Role.OWNER, Role.CASHIER)
  @ApiOperation({
    summary: 'Register money received (cashier/manager/owner)',
  })
  @ApiOkResponse({ type: PaymentResponseDto })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() actor: AuthUser) {
    return this.paymentsService.create(dto, actor);
  }

  @Get()
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'List payments with filters and pagination' })
  findAll(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Get one payment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post(':id/reverse')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse a payment with a reason (records are never deleted)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseDto })
  reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReversePaymentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.paymentsService.reverse(id, dto.reason, actor);
  }
}
