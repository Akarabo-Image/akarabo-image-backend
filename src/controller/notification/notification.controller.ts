import { Body, Controller, Delete, HttpCode, HttpStatus, Inject, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../application/auth-user';
import { PushNotificationService } from '../../service/notification/push-notification.service';
import { CurrentUser } from '../current-user.decorator';
import { Roles } from '../roles.decorator';
import { Role } from '../../util/roles';
import { DeviceTokenDto } from './device-token.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications/device-token')
export class NotificationController {
  constructor(
    @Inject(PushNotificationService)
    private readonly notifications: PushNotificationService,
  ) {}

  @Put()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Register or refresh this manager device for push alerts' })
  async register(@Body() dto: DeviceTokenDto, @CurrentUser() actor: AuthUser) {
    await this.notifications.registerDevice(actor.id, dto.token);
    return { success: true };
  }

  @Delete()
  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove this manager device from push alerts' })
  async remove(@Body() dto: DeviceTokenDto, @CurrentUser() actor: AuthUser) {
    await this.notifications.removeDevice(actor.id, dto.token);
    return { success: true };
  }
}
