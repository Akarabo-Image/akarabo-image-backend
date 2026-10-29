export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  db: {
    /**
     * 'postgres' — real PostgreSQL server (development / production).
     * 'sqljs'   — zero-setup embedded fallback so the project runs anywhere
     *             without a PostgreSQL installation.
     */
    type: (process.env.DB_TYPE ?? 'sqljs') as 'postgres' | 'sqljs',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'akarabo_studio',
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    // sqljs (embedded) settings — DB_SQLJS_AUTOSAVE=false gives an
    // in-memory database, which is what the test suites use.
    sqljsLocation: process.env.DB_SQLJS_LOCATION ?? 'akarabo_dev.sqlite',
    sqljsAutoSave: process.env.DB_SQLJS_AUTOSAVE !== 'false',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-env',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  },
  seed: {
    ownerName: process.env.SEED_OWNER_NAME ?? 'Studio Owner',
    ownerEmail: process.env.SEED_OWNER_EMAIL ?? 'owner@akarabo.rw',
    ownerPassword: process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxFileSizeBytes: parseInt(
      process.env.MAX_FILE_SIZE_BYTES ?? String(20 * 1024 * 1024),
      10,
    ),
  },
});
