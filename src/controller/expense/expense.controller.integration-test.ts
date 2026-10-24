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

interface ExpenseBody {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  expenseDate: string;
  status: string;
  recordedByUserId: string;
  reversedAt?: string;
  reversalReason?: string;
}

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string | string[];
}

interface ExpenseListBody {
  data: ExpenseBody[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Full-stack (real database, real guards) coverage of expenses: manager
 * recording, category filters, reversal rules.
 */
describe('ExpenseController (integration)', () => {
  let app: INestApplication<App>;

  const users = {
    owner: {
      email: 'owner-exp@test.rw',
      password: 'OwnerPass123',
      fullName: 'Test Owner',
      role: Role.OWNER,
    },
    manager: {
      email: 'manager-exp@test.rw',
      password: 'ManagerPass1',
      fullName: 'Test Manager',
      role: Role.MANAGER,
    },
    cashier: {
      email: 'cashier-exp@test.rw',
      password: 'CashierPass1',
      fullName: 'Test Cashier',
      role: Role.CASHIER,
    },
    photographer: {
      email: 'photo-exp@test.rw',
      password: 'PhotoPass123',
      fullName: 'Test Photographer',
      role: Role.PHOTOGRAPHER,
    },
  };

  let tokens: Record<string, string> = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();

    app = setupApp<App>(moduleFixture.createNestApplication());
    await app.init();
    const dataSource = app.get(DataSource);

    // Seed staff accounts directly (production uses `npm run seed` + users API).
    const userRepo = dataSource.getRepository(UserEntity);
    for (const staff of Object.values(users)) {
      await userRepo.save(
        userRepo.create({
          fullName: staff.fullName,
          email: staff.email,
          passwordHash: await bcrypt.hash(staff.password, 4),
          role: staff.role,
          isActive: true,
        }),
      );
    }

    tokens = {
      owner: await login(users.owner.email, users.owner.password),
      manager: await login(users.manager.email, users.manager.password),
      cashier: await login(users.cashier.email, users.cashier.password),
      photographer: await login(
        users.photographer.email,
        users.photographer.password,
      ),
    };
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

  function auth(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  const expensePayload = {
    category: 'PROPS',
    amount: 35000,
    description: 'Balloons and backdrop for a birthday setup',
  };

  describe('recording expenses', () => {
    it('rejects anonymous requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .send(expensePayload)
        .expect(401);
    });

    it('rejects photographers (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.photographer))
        .send(expensePayload)
        .expect(403);
    });

    it('denies cashiers access to expenses', async () => {
      await request(app.getHttpServer()).get('/api/v1/expenses').set(auth(tokens.cashier)).expect(403);
      await request(app.getHttpServer()).post('/api/v1/expenses').set(auth(tokens.cashier)).send(expensePayload).expect(403);
    });

    it('manager records an expense with the default currency and date', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.manager))
        .send(expensePayload)
        .expect(201);

      const body = response.body as ExpenseBody;
      expect(body.status).toBe('RECORDED');
      expect(body.currency).toBe('RWF');
      expect(body.expenseDate).toBeDefined();
    });

    it('rejects a non-positive amount (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.manager))
        .send({ ...expensePayload, amount: -100 })
        .expect(400);
    });

    it('rejects an unknown category (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.manager))
        .send({ ...expensePayload, category: 'GAMBLING' })
        .expect(400);
    });
  });

  describe('listing expenses', () => {
    it('filters by category for a manager', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.manager))
        .send({ ...expensePayload, category: 'TRANSPORT' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/expenses?category=TRANSPORT&limit=50')
        .set(auth(tokens.manager))
        .expect(200);

      const body = response.body as ExpenseListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((e) => e.category === 'TRANSPORT')).toBe(true);
    });
  });

  describe('reversing expenses', () => {
    let targetId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set(auth(tokens.manager))
        .send(expensePayload)
        .expect(201);
      targetId = (created.body as ExpenseBody).id;
    });

    it('refuses the cashier (403) — financial actions are manager/owner only', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/expenses/${targetId}/reverse`)
        .set(auth(tokens.cashier))
        .send({ reason: 'mistake' })
        .expect(403);
    });

    it('owner reverses with a reason and the record survives', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/expenses/${targetId}/reverse`)
        .set(auth(tokens.owner))
        .send({ reason: 'Entered twice by mistake' })
        .expect(200);

      const body = response.body as ExpenseBody;
      expect(body.status).toBe('REVERSED');
      expect(body.reversalReason).toBe('Entered twice by mistake');

      await request(app.getHttpServer())
        .get(`/api/v1/expenses/${targetId}`)
        .set(auth(tokens.owner))
        .expect(200);
    });

    it('refuses to reverse the same expense twice (409)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/expenses/${targetId}/reverse`)
        .set(auth(tokens.owner))
        .send({ reason: 'try again' })
        .expect(409);

      const body = response.body as ErrorBody;
      expect(body.message).toContain('already reversed');
    });
  });
});
