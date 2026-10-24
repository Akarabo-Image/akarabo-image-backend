import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../application/auth-user';
import { Role } from '../../util/roles';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { CreatePhotographerTaskDto, CreatePhotographerWorkDto, CreateStudioServiceDto, StudioReportQueryDto, UpdatePhotographerTaskDto, UpdateStudioServicePriorityDto, UpdateStudioServiceStatusDto } from './studio-report.dto';
import { STUDIO_REPORT_SERVICE, type StudioReportService } from '../../service/report/studio-report.service';

@ApiTags('studio-reports')
@ApiBearerAuth()
@Controller()
export class StudioReportController {
  constructor(@Inject(STUDIO_REPORT_SERVICE) private readonly reports: StudioReportService) {}

  @Get('studio-reports')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  list(@Query() query: StudioReportQueryDto) {
    return this.reports.list(query.from, query.to);
  }

  @Post('studio-services')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.PHOTOGRAPHER)
  createService(@Body() dto: CreateStudioServiceDto, @CurrentUser() actor: AuthUser) {
    return this.reports.createService(dto, actor);
  }

  @Patch('studio-services/:id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  updateServiceStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioServiceStatusDto) {
    return this.reports.updateServiceStatus(id, dto.status);
  }

  @Patch('studio-services/:id/priority')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  updateServicePriority(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudioServicePriorityDto) {
    return this.reports.updateServicePriority(id, dto.needsUrgentService);
  }

  @Get('photographers')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  listPhotographers() {
    return this.reports.listPhotographers();
  }

  @Get('studio-services/unfinished')
  @Roles(Role.PHOTOGRAPHER)
  unfinishedClients() {
    return this.reports.listUnfinishedClients();
  }

  @Post('photographer-work')
  @Roles(Role.PHOTOGRAPHER)
  createPhotographerWork(@Body() dto: CreatePhotographerWorkDto, @CurrentUser() actor: AuthUser) {
    return this.reports.createPhotographerWork(dto, actor);
  }

  @Post('photographer-tasks')
  @Roles(Role.CASHIER, Role.MANAGER, Role.OWNER)
  createPhotographerTask(@Body() dto: CreatePhotographerTaskDto, @CurrentUser() actor: AuthUser) {
    return this.reports.createTask(dto, actor);
  }

  @Get('photographer-tasks/mine')
  @Roles(Role.PHOTOGRAPHER)
  myPhotographerTasks(@CurrentUser() actor: AuthUser) {
    return this.reports.getMyTasks(actor);
  }

  @Get('photographer-tasks/completed')
  @Roles(Role.CASHIER, Role.MANAGER, Role.OWNER)
  completedPhotographerTasks(@CurrentUser() actor: AuthUser) {
    return this.reports.getCompletedTasks(actor);
  }

  @Patch('photographer-tasks/:id/read')
  @Roles(Role.PHOTOGRAPHER)
  markPhotographerTaskRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.reports.markTaskRead(id, actor);
  }

  @Patch('photographer-tasks/:id/status')
  @Roles(Role.PHOTOGRAPHER)
  updatePhotographerTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePhotographerTaskDto, @CurrentUser() actor: AuthUser) {
    return this.reports.updateTask(id, dto, actor);
  }
}
