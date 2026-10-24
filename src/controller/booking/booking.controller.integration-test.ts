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

interface BookingBody {
  id: string;
  customerId: string;
  serviceType: string;
  eventDate: string;
  startTime?: string;
  venue: string;
  expectedGuests?: number;
  priceAmount: number;
  priceCurrency: string;
  notes?: string;
  status: string;
  createdByUserId: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledByUserId?: string;
  cancellationReason?: string;
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

interface BookingListBody {
  data: BookingBody[];
  meta: { page: number; limit: number; total: number };
}

interface PaymentBody {
  id: string;
  bookingId?: string | null;
}

/**
 * Full-stack (real database, real guards) coverage of bookings: customer
 * conditions, date rules, one-active-booking-per-day, the whole lifecycle
 * and the payments → bookings link.
 */
describe('BookingController (integration)', () => {
  let app: INestApplication<App>;

  const users = {
    owner: {
      email: 'owner-book@test.rw',
      password: 'OwnerPass123',
      fullName: 'Test Owner',
      role: Role.OWNER,
    },
    manager: {
      email: 'manager-book@test.rw',
      password: 'ManagerPass1',
      fullName: 'Test Manager',
      role: Role.MANAGER,
    },
    cashier: {
      email: 'cashier-book@test.rw',
      password: 'CashierPass1',
      fullName: 'Test Cashier',
      role: Role.CASHIER,
    },
    photographer: {
      email: 'photo-book@test.rw',
      password: 'PhotoPass123',
      fullName: 'Test Photographer',
      role: Role.PHOTOGRAPHER,
    },
  };

  let tokens: Record<string, string> = {};
  let managerId: string;
  let customerId: string;
  let firstBookingId: string;
  let editableId: string;
  let pendingId: string;
  let cancelTargetId: string;
  let cancelTargetDate: string;

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

    customerId = await createCustomer('Booking Client', '+250788000777');
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

  async function createCustomer(name: string, phone: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(tokens.manager))
      .send({ name, phone })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  async function createBooking(
    overrides: Record<string, unknown> = {},
  ): Promise<BookingBody> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(auth(tokens.manager))
      .send({ ...bookingPayload, customerId, ...overrides })
      .expect(201);
    return response.body as BookingBody;
  }

  const bookingPayload = {
    serviceType: 'WEDDING',
    eventDate: '2030-06-20',
    startTime: '10:00',
    venue: 'Kigali Convention Centre',
    expectedGuests: 250,
    priceAmount: 1_200_000,
    notes: 'outdoor ceremony',
  };

  describe('creating bookings', () => {
    it('rejects anonymous requests (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({ ...bookingPayload, customerId })
        .expect(401);
    });

    it('rejects cashiers (403) — booking is manager/owner', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.cashier))
        .send({ ...bookingPayload, customerId })
        .expect(403);
    });

    it('rejects photographers (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.photographer))
        .send({ ...bookingPayload, customerId })
        .expect(403);
    });

    it('manager books the studio — the exact stored record', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId })
        .expect(201);

      // Exactly what got stored — every field of the created record:
      // lifecycle columns are null until the booking actually moves.
      expect(response.body).toEqual({
        id: expect.any(String) as string,
        customerId,
        serviceType: 'WEDDING',
        eventDate: '2030-06-20',
        startTime: '10:00',
        venue: 'Kigali Convention Centre',
        expectedGuests: 250,
        priceAmount: 1_200_000,
        priceCurrency: 'RWF',
        notes: 'outdoor ceremony',
        status: 'PENDING',
        createdByUserId: managerId,
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
      firstBookingId = (response.body as BookingBody).id;

      // Read it back through the API — the stored record matches exactly.
      const stored = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${firstBookingId}`)
        .set(auth(tokens.cashier))
        .expect(200);
      expect(stored.body).toEqual(response.body);
    });

    it('rejects an unknown customer (404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({
          ...bookingPayload,
          customerId: '99999999-9999-4999-8999-999999999999',
          eventDate: '2030-06-21',
        })
        .expect(404);

      expect((response.body as ErrorBody).message).toContain('not found');
    });

    it('rejects a deactivated customer (403)', async () => {
      const inactiveId = await createCustomer(
        'Deactivated Client',
        '+250788000888',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/customers/${inactiveId}/deactivate`)
        .set(auth(tokens.manager))
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({
          ...bookingPayload,
          customerId: inactiveId,
          eventDate: '2030-06-22',
        })
        .expect(403);
    });

    it('rejects a past event date (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId, eventDate: '2020-01-01' })
        .expect(400);
    });

    it('rejects a date that is not a real calendar day (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId, eventDate: '2030-02-31' })
        .expect(400);

      expect((response.body as ErrorBody).message).toContain('2030-02-31');
    });

    it('rejects a second active booking on the same day (409)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId })
        .expect(409);

      const body = response.body as ErrorBody;
      expect(body.success).toBe(false);
      expect(body.message).toContain('2030-06-20');
    });

    it('rejects a non-positive price (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId, priceAmount: 0 })
        .expect(400);
    });

    it('rejects an unknown service type (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set(auth(tokens.manager))
        .send({ ...bookingPayload, customerId, serviceType: 'GRADUATION' })
        .expect(400);
    });
  });

  describe('listing and reading bookings', () => {
    it('lets any staff list bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .set(auth(tokens.photographer))
        .expect(200);

      const body = response.body as BookingListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((b) => typeof b.eventDate === 'string')).toBe(
        true,
      );
    });

    it('filters by customer and event date range', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/bookings?customerId=${customerId}` +
            '&eventFrom=2030-01-01&eventTo=2030-12-31&limit=50',
        )
        .set(auth(tokens.cashier))
        .expect(200);

      const body = response.body as BookingListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((b) => b.customerId === customerId)).toBe(true);
      expect(
        body.data.every(
          (b) => b.eventDate >= '2030-01-01' && b.eventDate <= '2030-12-31',
        ),
      ).toBe(true);
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bookings/99999999-9999-4999-8999-999999999999')
        .set(auth(tokens.owner))
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/bookings/not-a-uuid')
        .set(auth(tokens.owner))
        .expect(400);
    });
  });

  describe('editing bookings', () => {
    beforeAll(async () => {
      editableId = (
        await createBooking({
          eventDate: '2030-07-10',
          venue: 'Original Venue',
        })
      ).id;
    });

    it('manager reschedules and edits, and the change persists', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${editableId}`)
        .set(auth(tokens.manager))
        .send({ eventDate: '2030-07-15', venue: 'New Venue' })
        .expect(200);

      expect((response.body as BookingBody).eventDate).toBe('2030-07-15');
      expect((response.body as BookingBody).venue).toBe('New Venue');

      const stored = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${editableId}`)
        .set(auth(tokens.owner))
        .expect(200);
      expect((stored.body as BookingBody).eventDate).toBe('2030-07-15');
    });

    it('rejects rescheduling into the past (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${editableId}`)
        .set(auth(tokens.manager))
        .send({ eventDate: '2020-06-01' })
        .expect(400);
    });

    it('refuses photographers (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/bookings/${editableId}`)
        .set(auth(tokens.photographer))
        .send({ venue: 'Nope' })
        .expect(403);
    });
  });

  describe('confirming and completing bookings', () => {
    beforeAll(async () => {
      pendingId = (await createBooking({ eventDate: '2030-08-01' })).id;
    });

    it('refuses the cashier (403) — confirm is manager/owner', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${pendingId}/confirm`)
        .set(auth(tokens.cashier))
        .expect(403);
    });

    it('manager confirms a pending booking', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${pendingId}/confirm`)
        .set(auth(tokens.manager))
        .expect(200);

      const body = response.body as BookingBody;
      expect(body.status).toBe('CONFIRMED');
      expect(body.confirmedAt).toEqual(expect.any(String) as string);
    });

    it('refuses to confirm the same booking twice (409)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${pendingId}/confirm`)
        .set(auth(tokens.owner))
        .expect(409);

      expect((response.body as ErrorBody).message).toContain('confirm');
    });

    it('filters the list by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/bookings?status=CONFIRMED&limit=50')
        .set(auth(tokens.cashier))
        .expect(200);

      const body = response.body as BookingListBody;
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((b) => b.status === 'CONFIRMED')).toBe(true);
      expect(body.data.find((b) => b.id === pendingId)).toBeDefined();
    });

    it('owner completes the confirmed booking — the event happened', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${pendingId}/complete`)
        .set(auth(tokens.owner))
        .expect(200);

      const body = response.body as BookingBody;
      expect(body.status).toBe('COMPLETED');
      expect(body.completedAt).toEqual(expect.any(String) as string);
    });

    it('refuses to complete a completed booking (409)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${pendingId}/complete`)
        .set(auth(tokens.manager))
        .expect(409);
    });

    it('refuses to complete a pending booking — confirm first (409)', async () => {
      const stillPending = await createBooking({ eventDate: '2030-08-03' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${stillPending.id}/complete`)
        .set(auth(tokens.manager))
        .expect(409);

      expect((response.body as ErrorBody).message).toContain('complete');
    });
  });

  describe('cancelling bookings', () => {
    beforeAll(async () => {
      const target = await createBooking({ eventDate: '2030-09-01' });
      cancelTargetId = target.id;
      cancelTargetDate = target.eventDate;
    });

    it('refuses the cashier (403) — cancellation is manager/owner', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
        .set(auth(tokens.cashier))
        .send({ reason: 'changed plans' })
        .expect(403);
    });

    it('requires a non-blank reason (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
        .set(auth(tokens.manager))
        .send({ reason: '' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
        .set(auth(tokens.manager))
        .send({ reason: '   ' })
        .expect(400);
    });

    it('manager cancels with a reason — the booking survives', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
        .set(auth(tokens.manager))
        .send({ reason: 'Family moved the event abroad' })
        .expect(200);

      const body = response.body as BookingBody;
      expect(body.status).toBe('CANCELLED');
      expect(body.cancellationReason).toBe('Family moved the event abroad');
      expect(body.cancelledByUserId).toBe(managerId);
      expect(body.cancelledAt).toEqual(expect.any(String) as string);

      // Still readable — bookings are cancelled, never deleted.
      const stored = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${cancelTargetId}`)
        .set(auth(tokens.cashier))
        .expect(200);
      expect((stored.body as BookingBody).status).toBe('CANCELLED');
    });

    it('refuses to cancel the same booking twice (409)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${cancelTargetId}/cancel`)
        .set(auth(tokens.owner))
        .send({ reason: 'try again' })
        .expect(409);

      expect((response.body as ErrorBody).message).toContain('cancel');
    });

    it('frees the day: the same customer can rebook it after cancellation', async () => {
      const rebooked = await createBooking({ eventDate: cancelTargetDate });

      expect(rebooked.status).toBe('PENDING');
      expect(rebooked.customerId).toBe(customerId);
      expect(rebooked.eventDate).toBe(cancelTargetDate);
    });
  });

  describe('payments against bookings', () => {
    it('requires cashier payments to be linked to a studio service', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set(auth(tokens.cashier))
        .send({
          bookingId: pendingId,
          amount: 500_000,
          method: 'MOBILE_MONEY',
          reference: 'MOMO-BK-0001',
          notes: 'booking deposit',
        })
        .expect(403);
    });
  });
});
