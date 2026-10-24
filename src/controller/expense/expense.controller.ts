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
  EXPENSE_SERVICE,
  type ExpenseService,
} from '../../service/expense/expense.service.interface';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  QueryExpensesDto,
  ReverseExpenseDto,
} from './expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpenseController {
  constructor(
    @Inject(EXPENSE_SERVICE) private readonly expensesService: ExpenseService,
  ) {}

  @Post()
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({
    summary: 'Register studio spending (transport, props, printing, ...)',
  })
  @ApiOkResponse({ type: ExpenseResponseDto })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() actor: AuthUser) {
    return this.expensesService.create(dto, actor);
  }

  @Get()
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'List expenses with filters and pagination' })
  findAll(@Query() query: QueryExpensesDto) {
    return this.expensesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Get one expense by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(id);
  }

  @Post(':id/reverse')
  @Roles(Role.MANAGER, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse an expense with a reason (records are never deleted)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseExpenseDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.expensesService.reverse(id, dto.reason, actor);
  }
}
