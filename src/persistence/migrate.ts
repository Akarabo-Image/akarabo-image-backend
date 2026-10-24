import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import dataSource from './database-connection';

/**
 * Migration runner (reliable alternative to `npx typeorm migration:*` on
 * newer Node versions):
 *
 *   npm run migrate          # apply pending migrations
 *   npm run migrate:revert   # revert the last applied migration
 */
async function run(): Promise<void> {
  loadEnv();

  const direction = process.argv[2] ?? 'run';
  const ds = await dataSource.initialize();
  try {
    if (direction === 'revert') {
      await ds.undoLastMigration();
      console.log('Last migration reverted.');
    } else {
      await ds.runMigrations();
      console.log('Migrations are up to date.');
    }
  } finally {
    await ds.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
