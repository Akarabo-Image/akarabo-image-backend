import { CanActivate, Injectable } from '@nestjs/common';

/**
 * Permissive stand-in for AuthenticationGuard, for tests that want to
 * exercise a controller without the JWT pipeline:
 *
 *   testingModule.overrideGuard(AuthenticationGuard).useClass(AuthenticationGuardMock)
 */
@Injectable()
export class AuthenticationGuardMock implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
