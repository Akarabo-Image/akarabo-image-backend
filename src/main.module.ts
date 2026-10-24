import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './controller/authentication.guard';
import { RolesGuard } from './controller/roles.guard';
import { ConfigModule } from './module/config.module';
import { ControllerModule } from './module/controller.module';
import { DatabaseModule } from './module/database.module';
import { RepositoryModule } from './module/repository.module';
import { ServiceModule } from './module/service.module';
import { UtilityModule } from './module/utility.module';

/**
 * Root module — wires the layers together:
 *
 *   application/  business logic (services, domain models, errors)
 *   controller/   HTTP layer (controllers, DTOs, guards, filters)
 *   persistence/  data access (entities, repositories, migrations)
 *   module/       NestJS module wiring, layer by layer
 */
@Module({
  imports: [
    ConfigModule,
    UtilityModule,
    DatabaseModule,
    RepositoryModule,
    ServiceModule,
    ControllerModule,
  ],
  providers: [
    // Order matters: authentication first, then authorization.
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class MainModule {}
