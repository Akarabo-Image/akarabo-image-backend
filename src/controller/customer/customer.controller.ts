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
  CUSTOMER_SERVICE,
  type CustomerService,
} from '../../service/customer/customer.service.interface';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import {
  CreateCustomerDto,
  CustomerResponseDto,
  QueryCustomersDto,
  UpdateCustomerDto,
} from './customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomerController {
  constructor(
    @Inject(CUSTOMER_SERVICE)
    private readonly customersService: CustomerService,
  ) {}

  @Post()
  @Roles(Role.MANAGER, Role.OWNER, Role.CASHIER, Role.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Register a new studio customer (cashier/manager/owner)' })
  @ApiOkResponse({ type: CustomerResponseDto })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() actor: AuthUser) {
    return this.customersService.create(dto, actor);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.PHOTOGRAPHER)
  @ApiOperation({ summary: 'List customers with filters and pagination' })
  findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.PHOTOGRAPHER)
  @ApiOperation({ summary: 'Get one customer by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Update customer details (manager/owner)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customersService.update(id, dto, actor);
  }

  @Post(':id/deactivate')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Deactivate a customer — blocked from new bookings (never deleted)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerResponseDto })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customersService.deactivate(id, actor);
  }

  @Post(':id/reactivate')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a deactivated customer' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CustomerResponseDto })
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customersService.reactivate(id, actor);
  }
}
