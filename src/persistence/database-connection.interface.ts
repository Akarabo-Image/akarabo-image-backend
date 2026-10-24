/** Settings derived from the environment (see database-connection.config.ts). */
export interface PostgresConnectionSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface SqljsConnectionSettings {
  /** false = pure in-memory database (used by the test suites). */
  autoSave: boolean;
  location?: string;
}

export interface DatabaseConnectionConfig {
  isPostgres: boolean;
  postgres: PostgresConnectionSettings;
  sqljs: SqljsConnectionSettings;
}

/** Minimal env lookup shared by ConfigService and process.env consumers. */
export type EnvReader = (key: string) => string | undefined;
