import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';

export const AUTHENTICATION_CONFIG = 'AUTHENTICATION_CONFIG';

/** Token-lifetime settings consumed by the authentication service. */
export interface AuthenticationConfig {
  expiresIn: string;
}

/** Factory for JwtModule.registerAsync (wired in src/module/service.module.ts). */
export function jwtModuleOptionsFactory(
  config: ConfigService,
): JwtModuleOptions {
  return {
    secret: config.getOrThrow<string>('jwt.secret'),
    signOptions: {
      expiresIn: config.getOrThrow<string>(
        'jwt.expiresIn',
      ) as JwtSignOptions['expiresIn'],
    },
  };
}

/** Factory for the AUTHENTICATION_CONFIG injection token. */
export function authenticationConfigFactory(
  config: ConfigService,
): AuthenticationConfig {
  return { expiresIn: config.getOrThrow<string>('jwt.expiresIn') };
}
