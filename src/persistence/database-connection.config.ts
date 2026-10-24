import type {
  DatabaseConnectionConfig,
  EnvReader,
} from './database-connection.interface';

/**
 * Builds the database connection settings from the environment. Used both by
 * the Nest database module (via ConfigService) and by the standalone scripts
 * (migrate/seed, via process.env), so the two can never drift apart.
 *
 * DB_TYPE=postgres — real PostgreSQL server (development / production).
 * DB_TYPE=sqljs    — zero-setup embedded fallback so the project runs anywhere
 *                    without a PostgreSQL installation.
 */
export function buildDatabaseConnectionConfig(
  read: EnvReader,
): DatabaseConnectionConfig {
  const isPostgres = (read('DB_TYPE') ?? 'sqljs') === 'postgres';

  return {
    isPostgres,
    postgres: {
      host: read('DB_HOST') ?? 'localhost',
      port: parseInt(read('DB_PORT') ?? '5432', 10),
      username: read('DB_USERNAME') ?? 'postgres',
      password: read('DB_PASSWORD') ?? '',
      database: read('DB_DATABASE') ?? 'akarabo_studio',
      ssl: read('DB_SSL') === 'true',
    },
    sqljs: {
      // DB_SQLJS_AUTOSAVE=false gives an in-memory database, which is what
      // the test suites use.
      autoSave: read('DB_SQLJS_AUTOSAVE') !== 'false',
      location: read('DB_SQLJS_LOCATION') ?? 'akarabo_dev.sqlite',
    },
  };
}
