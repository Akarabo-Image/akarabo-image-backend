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
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../application/auth-user';
import {
  USER_SERVICE,
  type UserService,
} from '../../service/user/user.service.interface';
import { Roles } from '../roles.decorator';
import { CurrentUser } from '../current-user.decorator';
import { Role } from '../../util/roles';
import { CreateUserDto, QueryUsersDto, UpdateUserDto } from './user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE) private readonly usersService: UserService,
  ) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a user account (owner/manager only)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.create(dto, actor);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'List users with pagination and filters' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Get one user by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a user (role, password, contact details)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Post(':id/deactivate')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a user access (soft)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.deactivate(id, actor);
  }

  @Post(':id/activate')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a deactivated user access' })
  @ApiParam({ name: 'id', format: 'uuid' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.activate(id, actor);
  }
}
