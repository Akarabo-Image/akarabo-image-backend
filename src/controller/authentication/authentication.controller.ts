import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AUTHENTICATION_SERVICE,
  type AuthenticationService,
} from '../../service/authentication/authentication.service.interface';
import { CurrentUser } from '../current-user.decorator';
import type { AuthUser } from '../../application/auth-user';
import { Public } from '../public.decorator';
import { LoginRequestDto } from './login.request-dto';
import { LoginResponseDto, LogoutResponseDto } from './login.response-dto';
import { AuthenticationError } from '../../application/authentication/authentication.error';
import { Role } from '../../util/roles';
import { PushNotificationService } from '../../service/notification/push-notification.service';

@ApiTags('auth')
@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(AUTHENTICATION_SERVICE)
    private readonly authenticationService: AuthenticationService,
    @Inject(PushNotificationService)
    private readonly notifications: PushNotificationService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a 30-day access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginRequestDto, @Req() req: Request) {
    try {
      const result = await this.authenticationService.login(dto, req.ip);
      if (
        result.user.role === Role.OWNER ||
        result.user.role === Role.MANAGER
      ) {
        await this.notifications.notifyUser(
          result.user.id,
          'New account sign-in',
          `Akarabo Studio account sign-in detected for ${result.user.fullName}.`,
          { type: 'auth_login', route: '/' },
        );
      }
      return result;
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;

      // Keep database, hash and token errors out of the public response.
      throw new InternalServerErrorException('Unable to process login');
    }
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record logout in the audit trail' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const result = await this.authenticationService.logout(user, req.ip);
    if (user.role === Role.OWNER || user.role === Role.MANAGER) {
      await this.notifications.notifyUser(
        user.id,
        'Account signed out',
        'Your Akarabo Studio account was signed out.',
        { type: 'auth_logout', route: '/login' },
      );
    }
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profile of the authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.authenticationService.me(user);
  }
}
