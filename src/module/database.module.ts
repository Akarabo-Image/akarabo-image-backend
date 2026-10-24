import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseConnectionConfig } from '../persistence/database-connection.config';

/**
 * Global database module. The connection is built from the same env-derived
 * settings used by the standalone migrate/seed scripts
 * (src/persistence/database-connection.config.ts), so they cannot drift.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Jest loads .ts migrations through its own transformer; the running
        // server (node dist/main) must use the compiled .js migrations —
        // Node 24 cannot require() decorator-bearing .ts files at runtime.
        const isJest = !!process.env.JEST_WORKER_ID;
        const connection = buildDatabaseConnectionConfig((key) =>
          config.get<string>(key),
        );

        const common = {
          autoLoadEntities: true,
          synchronize: config.get<boolean>('db.synchronize', false),
          migrations: [
            // Jest loads .ts migrations through ts-jest; the running server
            // (node dist/main) uses the copies compiled by
            // `tsc -p tsconfig.migrations.json` during the build.
            isJest ? 'migrations/*.ts' : 'dist/migrations/*.js',
          ],
          migrationsRun:
            isJest || config.get<string>('nodeEnv') !== 'production',
        };

        if (connection.isPostgres) {
          return {
            ...common,
            type: 'postgres' as const,
            host: connection.postgres.host,
            port: connection.postgres.port,
            username: connection.postgres.username,
            password: connection.postgres.password,
            database: connection.postgres.database,
            ssl: connection.postgres.ssl
              ? { rejectUnauthorized: false }
              : false,
          };
        }

        // Zero-setup embedded fallback (no PostgreSQL server required).
        return {
          ...common,
          type: 'sqljs' as const,
          autoSave: connection.sqljs.autoSave,
          location: connection.sqljs.autoSave
            ? connection.sqljs.location
            : undefined,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
