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

interface CustomerBody {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface LoginBody {
  accessToken: string;
}

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string | string[];
}

interface CustomerListBody {
  data: CustomerBody[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Full-stack (real database, real guards) coverage of customers: staff-only
 * registration, shared phone numbers, deactivation-as-delete-replacement.
 */
describe('CustomerController (integration)', () => {
  let app: INestApplication<App>;

  const users = {
    owner: {
      email: 'owner-cust@test.rw',
      password: 'OwnerPass123',
      fullName: 'Test Owner',
      role: Role.OWNER,
    },
    manager: {
      email: 'manager-cust@test.rw',
      password: 'ManagerPass1',
      fullName: 'Test Manager',
      role: Role.MANAGER,
    },
    cashier: {
      email: 'cashier-cust@test.rw',
      password: 'CashierPass1',
      fullName: 'Test Cashier',
      role: Role.CASHIER,
    },
    photographer: {
      email: 'photo-cust@test.rw',
      password: 'PhotoPass123',
      fullName: 'Test Photographer',
      role: Role.PHOTOGRAPHER,
    },
  };

  let tokens: Record<string, string> = {};
  let managerId: string;
  let alineId: string;
  let peterId: string;

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
      const saved = await userRepo.save(
        userRepo.create({
          fullName: staff.fullName,
          email: staff.email,
          passwordHash: await bcrypt.hash(staff.password, 4),
          role: staff.role,
          isActive: true,
        }),
      );
      if (staff.role === Role.MANAGER) {
        managerId = saved.id;
      }
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

  const customerPayload = {
    name: 'Aline Uwase',
    phone: '+250788111222',
    email: 'aline@example.rw',
    address: 'KG 11 Ave, Kigali',
    notes: 'prefers WhatsApp',
  };

  describe('creating customers', () => {
    it('rejects anonymous requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .send(customerPayload)
        .expect(401);
    });

    it('allows cashiers to register customers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.cashier))
        .send({ ...customerPayload, name: 'Cashier Test', phone: '+250788999101' })
        .expect(201);
      expect(response.body).toEqual(expect.objectContaining({ name: 'Cashier Test', createdByUserId: expect.any(String) }));
    });

    it('manager registers a customer — the exact stored record', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.manager))
        .send(customerPayload)
        .expect(201);

      // Exactly what got stored — every field of the created record:
      // nullable columns come back as null when nothing was set.
      expect(response.body).toEqual({
        id: expect.any(String) as string,
        name: 'Aline Uwase',
        phone: '+250788111222',
        email: 'aline@example.rw',
        address: 'KG 11 Ave, Kigali',
        notes: 'prefers WhatsApp',
        isActive: true,
        createdByUserId: managerId,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
      alineId = (response.body as CustomerBody).id;

      // Read it back through the API — the stored record matches exactly.
      const stored = await request(app.getHttpServer())
        .get(`/api/v1/customers/${alineId}`)
        .set(auth(tokens.manager))
        .expect(200);
      expect(stored.body).toEqual(response.body);
    });

    it('stores a minimal customer with null optional fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.manager))
        .send({ name: 'Peter Mugisha', phone: '+250788222333' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String) as string,
        name: 'Peter Mugisha',
        phone: '+250788222333',
        email: null,
        address: null,
        notes: null,
        isActive: true,
        createdByUserId: managerId,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
      peterId = (response.body as CustomerBody).id;
    });

    it('allows a duplicate phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.manager))
        .send({ name: 'Impostor', phone: '+250788111222' })
        .expect(201);
      expect((response.body as CustomerBody).phone).toBe('+250788111222');
    });

    it('rejects a missing name (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.manager))
        .send({ phone: '+250788333444' })
        .expect(400);
    });

    it('rejects an invalid email (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.manager))
        .send({
          name: 'Bad Email',
          phone: '+250788333555',
          email: 'not-an-email',
        })
        .expect(400);
    });
  });

  describe('listing and reading customers', () => {
    it('lets any staff list customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set(auth(tokens.photographer))
        .expect(200);

      const body = response.body as CustomerListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((c) => typeof c.name === 'string')).toBe(true);
    });

    it('filters by free-text search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/customers?search=aline')
        .set(auth(tokens.cashier))
        .expect(200);

      const body = response.body as CustomerListBody;
      expect(body.data.find((c) => c.id === alineId)).toBeDefined();
      expect(body.data.find((c) => c.id === peterId)).toBeUndefined();
    });

    it('filters by active flag', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/deactivate`)
        .set(auth(tokens.manager))
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/customers?isActive=false')
        .set(auth(tokens.cashier))
        .expect(200);

      const body = response.body as CustomerListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((c) => c.isActive === false)).toBe(true);
      expect(body.data.find((c) => c.id === peterId)).toBeDefined();

      // Put Peter back for the rest of the suite.
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/reactivate`)
        .set(auth(tokens.manager))
        .expect(200);
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customers/99999999-9999-4999-8999-999999999999')
        .set(auth(tokens.owner))
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/customers/not-a-uuid')
        .set(auth(tokens.owner))
        .expect(400);
    });
  });

  describe('updating customers', () => {
    it('manager updates a field and the change persists', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${alineId}`)
        .set(auth(tokens.manager))
        .send({ notes: 'moved to Rubavu' })
        .expect(200);

      expect((response.body as CustomerBody).notes).toBe('moved to Rubavu');
      expect((response.body as CustomerBody).name).toBe('Aline Uwase');

      const stored = await request(app.getHttpServer())
        .get(`/api/v1/customers/${alineId}`)
        .set(auth(tokens.owner))
        .expect(200);
      expect((stored.body as CustomerBody).notes).toBe('moved to Rubavu');
    });

    it('allows moving to a phone number another customer uses', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/customers/${peterId}`)
        .set(auth(tokens.manager))
        .send({ phone: '+250788111222' })
        .expect(200);
      expect((response.body as CustomerBody).phone).toBe('+250788111222');
    });

    it('refuses photographers (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/customers/${alineId}`)
        .set(auth(tokens.photographer))
        .send({ notes: 'nope' })
        .expect(403);
    });
  });

  describe('deactivating customers', () => {
    it('manager deactivates — the flag flips, the row survives', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/deactivate`)
        .set(auth(tokens.manager))
        .expect(200);

      expect((response.body as CustomerBody).isActive).toBe(false);

      // Deactivation never deletes: the customer stays fully readable.
      const stored = await request(app.getHttpServer())
        .get(`/api/v1/customers/${peterId}`)
        .set(auth(tokens.cashier))
        .expect(200);
      expect((stored.body as CustomerBody).isActive).toBe(false);
      // The earlier update test moves this customer to the shared phone.
      expect((stored.body as CustomerBody).phone).toBe('+250788111222');
    });

    it('is idempotent — deactivating twice still succeeds (200)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/deactivate`)
        .set(auth(tokens.owner))
        .expect(200);

      expect((response.body as CustomerBody).isActive).toBe(false);
    });

    it('owner reactivates the customer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/reactivate`)
        .set(auth(tokens.owner))
        .expect(200);

      expect((response.body as CustomerBody).isActive).toBe(true);
    });

    it('refuses cashiers (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${peterId}/deactivate`)
        .set(auth(tokens.cashier))
        .expect(403);
    });
  });
});
