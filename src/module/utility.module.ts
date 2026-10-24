import { Global, Module } from '@nestjs/common';
import { TIME_PROVIDER } from '../application/time-provider.interface';
import { SystemTimeProvider } from '../util/system-time-provider';

/** Global module for shared utilities (currently the system clock). */
@Global()
@Module({
  providers: [{ provide: TIME_PROVIDER, useClass: SystemTimeProvider }],
  exports: [TIME_PROVIDER],
})
export class UtilityModule {}
