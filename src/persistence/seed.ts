import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { Role } from '../util/roles';
import dataSource from './database-connection';
import { UserEntity } from './user/user.entity';

/**
 * Idempotent seed: creates the initial OWNER account from SEED_OWNER_* env
 * variables if it does not exist yet.
 *
 *   npm run seed
 */
async function run(): Promise<void> {
  loadEnv();

  const ds = await dataSource.initialize();
  try {
    await ds.runMigrations();

    const users = ds.getRepository(UserEntity);
    const email = process.env.SEED_OWNER_EMAIL ?? 'owner@akarabo.rw';

    const existing = await users.findOne({ where: { email } });
    if (existing) {
      console.log(`Owner account already exists: ${email}`);
      return;
    }

    const password = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';
    await users.save(
      users.create({
        fullName: process.env.SEED_OWNER_NAME ?? 'Studio Owner',
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: Role.OWNER,
        isActive: true,
      }),
    );

    console.log(`Seeded owner account: ${email}`);
  } finally {
    await ds.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
