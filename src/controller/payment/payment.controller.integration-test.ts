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

interface PaymentBody {
  id: string;
  bookingId?: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  status: string;
  recordedByUserId: string;
  reversedAt?: string;
  reversedByUserId?: string;
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

interface PaymentListBody {
  data: PaymentBody[];
  meta: { page: number; limit: number; total: number };
}

/**
 * Full-stack (real database, real guards) coverage of payments: manager
 * recording, duplicate-receipt protection, reversal rules.
 */
describe('PaymentController (integration)', () => {
  let app: INestApplication<App>;

  const users = {
    owner: {
      email: 'owner-pay@test.rw',
      password: 'OwnerPass123',
      fullName: 'Test Owner',
      role: Role.OWNER,
    },
    manager: {
      email: 'manager-pay@test.rw',
      password: 'ManagerPass1',
      fullName: 'Test Manager',
      role: Role.MANAGER,
    },
    cashier: {
      email: 'cashier-pay@test.rw',
      password: 'CashierPass1',
      fullName: 'Test Cashier',
      role: Role.CASHIER,
    },
    photographer: {
      email: 'photo-pay@test.rw',
      password: 'PhotoPass123',
      fullName: 'Test Photographer',
      role: Role.PHOTOGRAPHER,
    },
  };

  let tokens: Record<string, string> = {};
  let managerId: string;
  let photographerId = '';

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
      if (staff.role === Role.PHOTOGRAPHER) {
        photographerId = saved.id;
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

  const paymentPayload = {
    amount: 150000,
    method: 'MOBILE_MONEY',
    reference: 'MOMO-IT-0001',
    notes: 'booking deposit',
  };

  describe('recording payments', () => {
    it('rejects anonymous requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .send(paymentPayload)
        .expect(401);
    });

    it('rejects photographers (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.photographer))
        .send(paymentPayload)
        .expect(403);
    });

    it('denies cashiers access to payments', async () => {
      await request(app.getHttpServer()).get('/api/v1/payments').set(auth(tokens.cashier)).expect(403);
      await request(app.getHttpServer()).post('/api/v1/payments').set(auth(tokens.cashier)).send(paymentPayload).expect(403);
    });

    it('manager records a payment attributed to themselves', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send(paymentPayload)
        .expect(201);

      // Exactly what got stored — every field of the created record:
      // nullable columns come back as null when nothing was set.
      expect(response.body).toEqual({
        id: expect.any(String) as string,
        bookingId: null,
        studioServiceId: null,
        amount: 150000,
        currency: 'RWF',
        method: 'MOBILE_MONEY',
        reference: 'MOMO-IT-0001',
        notes: 'booking deposit',
        status: 'COMPLETED',
        recordedByUserId: managerId,
        reversedAt: null,
        reversedByUserId: null,
        reversalReason: null,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });

      // Read it back through the API — the stored record matches exactly.
      const stored = await request(app.getHttpServer())
        .get(`/api/v1/payments/${(response.body as PaymentBody).id}`)
        .set(auth(tokens.manager))
        .expect(200);
      expect(stored.body).toEqual(response.body);
    });

    it('rejects a non-positive amount (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({ ...paymentPayload, amount: 0, reference: 'MOMO-IT-0002' })
        .expect(400);
    });

    it('rejects an unknown payment method (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({
          ...paymentPayload,
          method: 'CHEQUE',
          reference: 'MOMO-IT-0003',
        })
        .expect(400);
    });

    it('rejects the same receipt reference twice (409)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.owner))
        .send(paymentPayload)
        .expect(409);

      const body = response.body as ErrorBody;
      expect(body.success).toBe(false);
      expect(body.message).toContain('MOMO-IT-0001');
    });

    it('keeps the optional booking link', async () => {
      const bookingId = 'bbbbbbbb-1111-4111-8111-111111111111';

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({ ...paymentPayload, reference: 'MOMO-IT-BOOKING', bookingId })
        .expect(201);

      expect((response.body as PaymentBody).bookingId).toBe(bookingId);
    });
  });

  describe('listing and reading payments', () => {
    it('lists payments with method filter for a manager', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({ amount: 50000, method: 'CASH', reference: 'CASH-IT-0001' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/payments?method=CASH&limit=50')
        .set(auth(tokens.manager))
        .expect(200);

      const body = response.body as PaymentListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((p) => p.method === 'CASH')).toBe(true);
    });

    it('fetches one payment by id', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({ amount: 25000, method: 'CASH', reference: 'CASH-IT-0002' })
        .expect(201);
      const { id } = created.body as PaymentBody;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${id}`)
        .set(auth(tokens.manager))
        .expect(200);

      expect((response.body as PaymentBody).id).toBe(id);
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/99999999-9999-9999-9999-999999999999')
        .set(auth(tokens.owner))
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/payments/not-a-uuid')
        .set(auth(tokens.owner))
        .expect(400);
    });
  });

  describe('reversing payments', () => {
    let targetId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.manager))
        .send({ amount: 80000, method: 'CASH', reference: 'CASH-REVERSE-1' })
        .expect(201);
      targetId = (created.body as PaymentBody).id;
    });

    it('refuses the cashier (403) — financial actions are manager/owner only', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/payments/${targetId}/reverse`)
        .set(auth(tokens.cashier))
        .send({ reason: 'mistake' })
        .expect(403);
    });

    it('requires a reason (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/payments/${targetId}/reverse`)
        .set(auth(tokens.owner))
        .send({ reason: '' })
        .expect(400);
    });

    it('owner reverses with a reason and the record survives', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/payments/${targetId}/reverse`)
        .set(auth(tokens.owner))
        .send({ reason: 'Cash counted twice at handover' })
        .expect(200);

      const body = response.body as PaymentBody;
      expect(body.status).toBe('REVERSED');
      expect(body.reversalReason).toBe('Cash counted twice at handover');
      expect(body.reversedByUserId).toBeDefined();
      expect(body.amount).toBe(80000);

      // Still readable — reversals never delete financial rows.
      await request(app.getHttpServer())
        .get(`/api/v1/payments/${targetId}`)
        .set(auth(tokens.owner))
        .expect(200);
    });

    it('refuses to reverse the same payment twice (409)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/payments/${targetId}/reverse`)
        .set(auth(tokens.owner))
        .send({ reason: 'try again' })
        .expect(409);

      const body = response.body as ErrorBody;
      expect(body.message).toContain('already reversed');
    });
  });

  describe('cashier and photographer studio reporting', () => {
    it('reports receipts, urgency, and photo work and notifies assigned photographers', async () => {
      const reportDate = new Date().toISOString().slice(0, 10);
      const customerResponse = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set(auth(tokens.cashier))
        .send({ name: 'Report Client', phone: '+250788990777' })
        .expect(201);
      const customerId = customerResponse.body.id as string;

      const serviceResponse = await request(app.getHttpServer())
        .post('/api/v1/studio-services')
        .set(auth(tokens.cashier))
        .send({ customerId, serviceDate: reportDate, photosTaken: 6, softPhotos: 4, hardPhotos: 2, totalAmount: 100000, needsUrgentService: true })
        .expect(201);
      const serviceId = serviceResponse.body.id as string;

      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.cashier))
        .send({ studioServiceId: serviceId, amount: 45000, method: 'CASH' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/photographer-work')
        .set(auth(tokens.photographer))
        .send({ workDate: reportDate, editedPhotos: 13, notes: 'Family portraits' })
        .expect(201);

      const assignment = await request(app.getHttpServer())
        .post('/api/v1/photographer-tasks')
        .set(auth(tokens.cashier))
        .send({ studioServiceId: serviceId, photographerUserId: photographerId, taskDate: reportDate, photosToEdit: 4, notes: 'Prioritize edits' })
        .expect(201);
      const assignmentId = assignment.body.id as string;
      const photographerTasks = await request(app.getHttpServer())
        .get('/api/v1/photographer-tasks/mine')
        .set(auth(tokens.photographer))
        .expect(200);
      expect(photographerTasks.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: assignmentId, customerName: 'Report Client', readAt: null, status: 'ASSIGNED' })]));
      await request(app.getHttpServer()).patch(`/api/v1/photographer-tasks/${assignmentId}/read`).set(auth(tokens.photographer)).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/photographer-tasks/${assignmentId}/status`).set(auth(tokens.photographer)).send({ status: 'IN_PROGRESS' }).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/photographer-tasks/${assignmentId}/status`).set(auth(tokens.photographer)).send({ status: 'COMPLETED', editedPhotos: 3 }).expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/photographer-tasks')
        .set(auth(tokens.cashier))
        .send({ studioServiceId: serviceId, photographerUserId: photographerId, taskDate: reportDate, photosToEdit: 3 })
        .expect(400);

      const report = await request(app.getHttpServer())
        .get(`/api/v1/studio-reports?from=${reportDate}&to=${reportDate}`)
        .set(auth(tokens.manager))
        .expect(200);
      expect(report.body.summary).toEqual(expect.objectContaining({ clientCount: expect.any(Number), photosTaken: expect.any(Number), moneyReceived: expect.any(Number) }));
      expect(report.body.payments).toEqual(expect.arrayContaining([expect.objectContaining({ customerName: 'Report Client', amount: 45000, receivedBy: 'Test Cashier' })]));
      expect(report.body.urgentClients).toEqual(expect.arrayContaining([expect.objectContaining({ id: serviceId })]));
      expect(report.body.clients).toEqual(expect.arrayContaining([
        expect.objectContaining({ customerName: 'Report Client', phoneNumber: '+250788990777', photosTaken: 6, softPhotos: 4, hardPhotos: 2, paidAmount: 45000, remainingAmount: 55000, serviceStatus: 'IN_PROGRESS' }),
      ]));
      expect(report.body.photographerWork).toEqual(expect.arrayContaining([
        expect.objectContaining({ photographerName: 'Test Photographer', editedPhotos: 13, notes: 'Family portraits' }),
      ]));
      expect(report.body.photographerTotals).toEqual(expect.arrayContaining([expect.objectContaining({ photographerUserId: photographerId, photosAssigned: 4, photosEdited: 3 })]));
      expect(report.body.photographerTasks).toEqual(expect.arrayContaining([expect.objectContaining({ id: assignmentId, status: 'COMPLETED', editedPhotos: 3 })]));

      await request(app.getHttpServer())
        .patch(`/api/v1/studio-services/${serviceId}/status`)
        .set(auth(tokens.cashier))
        .send({ status: 'SERVED' })
        .expect(200);
      const refreshed = await request(app.getHttpServer())
        .get(`/api/v1/studio-reports?from=${reportDate}&to=${reportDate}`)
        .set(auth(tokens.owner))
        .expect(200);
      expect(refreshed.body.clients).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: serviceId, paidAmount: 45000, remainingAmount: 55000, serviceStatus: 'SERVED', needsUrgentService: false }),
      ]));
      expect(refreshed.body.urgentClients).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: serviceId })]));
      expect(refreshed.body.servedClients).toEqual(expect.arrayContaining([expect.objectContaining({ id: serviceId })]));
    });
  });
});
