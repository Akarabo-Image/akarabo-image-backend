import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MainModule } from '../../main.module';
import { AUTHENTICATION_SERVICE } from '../../service/authentication/authentication.service.interface';
import type { AuthenticationService } from '../../service/authentication/authentication.service.interface';
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
  expiresIn: string;
  user: UserBody;
}

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string | string[];
}

interface SuccessBody {
  success: boolean;
}

/**
 * Full-stack (real database, real guards) coverage of the authentication
 * flows: login, token validation, logout.
 */
describe('AuthenticationController (integration)', () => {
  let app: INestApplication<App>;

  const ownerCredentials = {
    email: 'owner@test.rw',
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

  describe('POST /api/v1/auth/login', () => {
    it('returns a token and sanitized user on valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: ownerCredentials.email,
          password: ownerCredentials.password,
        })
        .expect(200);

      const body = response.body as LoginBody;
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.expiresIn).toBe('1d');
      expect(body.user.email).toBe(ownerCredentials.email);
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 401 for a wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ownerCredentials.email, password: 'WrongPass123' })
        .expect(401);

      expect((response.body as ErrorBody).message).toBe(
        'Invalid email or password',
      );
    });

    it('returns 401 for an unknown email (same message, no user enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@here.rw', password: 'Whatever123' })
        .expect(401);

      expect((response.body as ErrorBody).message).toBe(
        'Invalid email or password',
      );
    });

    it('returns a generic 500 when an internal login dependency fails', async () => {
      const authenticationService = app.get<AuthenticationService>(AUTHENTICATION_SERVICE);
      const loginSpy = jest
        .spyOn(authenticationService, 'login')
        .mockRejectedValueOnce(new Error('database credential detail'));

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: ownerCredentials.email,
          password: ownerCredentials.password,
        })
        .expect(500);

      expect((response.body as ErrorBody).message).toBe('Unable to process login');
      expect(JSON.stringify(response.body)).not.toContain('database credential detail');
      loginSpy.mockRestore();
    });

    it('returns 400 for an invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns the profile with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = response.body as UserBody;
      expect(body.email).toBe(ownerCredentials.email);
      expect(body.role).toBe(Role.OWNER);
    });

    it('returns 401 for a garbage token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('records the logout and reports success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect((response.body as SuccessBody).success).toBe(true);
    });
  });
});
