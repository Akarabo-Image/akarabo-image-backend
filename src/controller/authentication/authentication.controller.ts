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

@ApiTags('auth')
@Controller('auth')
export class AuthenticationController {
  constructor(
    @Inject(AUTHENTICATION_SERVICE)
    private readonly authenticationService: AuthenticationService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a 1-day access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginRequestDto, @Req() req: Request) {
    try {
      return await this.authenticationService.login(dto, req.ip);
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
  logout(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.authenticationService.logout(user, req.ip);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profile of the authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.authenticationService.me(user);
  }
}
