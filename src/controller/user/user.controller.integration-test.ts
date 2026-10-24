import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MainModule } from '../../main.module';
import { Role } from '../../util/roles';
import { UserEntity } from '../../persistence/user/user.entity';
import { setupApp, useInMemoryDatabase } from '../../setup-app';

useInMemoryDatabase();

interface UserBody {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string | string[];
}

interface UsersListBody {
  data: UserBody[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Full-stack (real database, real guards) coverage of user management:
 * role protection, uniqueness, deactivation rules.
 */
describe('UserController (integration)', () => {
  let app: INestApplication<App>;

  const ownerCredentials = {
    email: 'owner-users@test.rw',
    password: 'OwnerPass123',
    fullName: 'Test Owner',
  };
  let ownerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();

    app = setupApp<App>(moduleFixture.createNestApplication());
    await app.init();
    const dataSource = app.get(DataSource);

    // Seed an owner account directly (production uses `npm run seed`).
    const users = dataSource.getRepository(UserEntity);
    await users.save(
      users.create({
        fullName: ownerCredentials.fullName,
        email: ownerCredentials.email,
        passwordHash: await bcrypt.hash(ownerCredentials.password, 4),
        role: Role.OWNER,
        isActive: true,
      }),
    );

    ownerToken = await login(ownerCredentials.email, ownerCredentials.password);
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return (response.body as LoginBody).accessToken;
  }

  describe('User management (role-protected)', () => {
    const managerCredentials = {
      email: 'manager@test.rw',
      password: 'ManagerPass1',
      fullName: 'Test Manager',
      role: Role.MANAGER,
    };
    let managerToken: string;
    let managerId: string;

    it('rejects listing users without a token (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('owner can create a manager', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(managerCredentials)
        .expect(201);

      const body = response.body as UserBody;
      managerId = body.id;
      expect(body.role).toBe(Role.MANAGER);
      expect(body).not.toHaveProperty('passwordHash');

      managerToken = await login(
        managerCredentials.email,
        managerCredentials.password,
      );
    });

    it('rejects duplicate emails with 409', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(managerCredentials)
        .expect(409);

      expect((response.body as ErrorBody).success).toBe(false);
      expect((response.body as ErrorBody).statusCode).toBe(409);
    });

    it('rejects invalid payloads with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ fullName: 'X', email: 'bad', password: 'short', role: 'NOPE' })
        .expect(400);
    });

    it('a photographer token cannot list users (403)', async () => {
      const photographerCredentials = {
        email: 'photographer@test.rw',
        password: 'PhotoPass123',
        fullName: 'Test Photographer',
        phone: '+250788999888',
        role: Role.PHOTOGRAPHER,
      };
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(photographerCredentials)
        .expect(201);

      const photographerToken = await login(
        photographerCredentials.email,
        photographerCredentials.password,
      );
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${photographerToken}`)
        .expect(403);

      expect((response.body as ErrorBody).statusCode).toBe(403);
    });

    it('a manager cannot create an owner account (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          fullName: 'Sneaky Owner',
          email: 'sneaky@akarabo.rw',
          password: 'SneakyPass1',
          role: Role.OWNER,
        })
        .expect(403);
    });

    it('lists users for managers with pagination meta', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const body = response.body as UsersListBody;
      expect(body.data.length).toBeGreaterThanOrEqual(3);
      expect(body.meta).toEqual(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
      for (const user of body.data) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('supports filtering by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users?role=MANAGER')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      const body = response.body as UsersListBody;
      expect(body.data.every((user) => user.role === Role.MANAGER)).toBe(true);
    });

    it('returns 404 for an unknown user id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);
    });

    it('deactivated users can no longer log in', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${managerId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: managerCredentials.email,
          password: managerCredentials.password,
        })
        .expect(401);
    });

    it('only the owner can reactivate a user (403 for manager)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${managerId}/activate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const newManagerToken = await login(
        managerCredentials.email,
        managerCredentials.password,
      );
      await request(app.getHttpServer())
        .post(`/api/v1/users/${managerId}/activate`)
        .set('Authorization', `Bearer ${newManagerToken}`)
        .expect(403);
    });
  });
});
