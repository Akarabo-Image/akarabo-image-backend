import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../util/roles';

export class LoginUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Studio Owner' })
  fullName: string;

  @ApiProperty({ example: 'owner@akarabo.rw' })
  email: string;

  @ApiProperty({ example: '+250788123456', nullable: true })
  phone?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  isActive: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT valid for one day' })
  accessToken: string;

  @ApiProperty({ example: '1d' })
  expiresIn: string;

  @ApiProperty({ type: LoginUserResponseDto })
  user: LoginUserResponseDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    example: 'Logged out successfully. Discard your access token.',
  })
  message: string;
}
