import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../application/auth-user';
import { InquiryService } from '../../service/inquiry/inquiry.service';
import { CurrentUser } from '../current-user.decorator';
import { Public } from '../public.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import { CreateInquiryDto } from './inquiry.dto';

@ApiTags('client inquiries')
@Controller('inquiries')
export class InquiryController {
  constructor(@Inject(InquiryService) private readonly inquiries: InquiryService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a client enquiry or booking request' })
  create(@Body() dto: CreateInquiryDto) {
    return this.inquiries.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'List client enquiries for the studio inbox' })
  list() {
    return this.inquiries.list();
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Mark a client enquiry as seen' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.inquiries.markRead(id, actor);
  }
}
