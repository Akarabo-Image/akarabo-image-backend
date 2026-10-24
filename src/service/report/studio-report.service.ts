import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import type { AuthUser } from '../../application/auth-user';
import { PaymentStatus } from '../../application/payment/payment';
import { CustomerEntity } from '../../persistence/customer/customer.entity';
import { PaymentEntity } from '../../persistence/payment/payment.entity';
import { PhotographerTaskEntity, PhotographerTaskStatus } from '../../persistence/photographer-task/photographer-task.entity';
import { PhotographerWorkEntity } from '../../persistence/photographer-work/photographer-work.entity';
import { StudioServiceEntity, StudioServiceStatus } from '../../persistence/studio-service/studio-service.entity';
import { UserEntity } from '../../persistence/user/user.entity';
import { Role } from '../../util/roles';
import type { CreatePhotographerTaskDto, CreatePhotographerWorkDto, CreateStudioServiceDto, UpdatePhotographerTaskDto } from '../../controller/report/studio-report.dto';

export const STUDIO_REPORT_SERVICE = Symbol('STUDIO_REPORT_SERVICE');

@Injectable()
export class StudioReportService {
  constructor(
    @InjectRepository(StudioServiceEntity) private readonly services: Repository<StudioServiceEntity>,
    @InjectRepository(PhotographerWorkEntity) private readonly photographerWork: Repository<PhotographerWorkEntity>,
    @InjectRepository(PhotographerTaskEntity) private readonly tasks: Repository<PhotographerTaskEntity>,
    @InjectRepository(CustomerEntity) private readonly customers: Repository<CustomerEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}

  async list(from: string, to: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      throw new BadRequestException('Report dates must be valid ISO days with from before or equal to to.');
    }

    const services = await this.services.find({ where: { serviceDate: Between(from, to) }, order: { serviceDate: 'DESC', createdAt: 'DESC' } });
    const serviceIds = services.map(({ id }) => id);
    const [allServicePayments, receivedPayments, work, tasks] = await Promise.all([
      serviceIds.length ? this.payments.find({ where: { studioServiceId: In(serviceIds), status: PaymentStatus.COMPLETED } }) : Promise.resolve([]),
      this.payments.find({ where: { studioServiceId: Not(IsNull()), status: PaymentStatus.COMPLETED, createdAt: Between(new Date(`${from}T00:00:00.000+02:00`), new Date(`${to}T23:59:59.999+02:00`)) }, order: { createdAt: 'DESC' } }),
      this.photographerWork.find({ where: { workDate: Between(from, to) }, order: { workDate: 'DESC', createdAt: 'DESC' } }),
      this.tasks.find({ where: { taskDate: Between(from, to) }, order: { taskDate: 'ASC', createdAt: 'ASC' } }),
    ]);

    const receivedServiceIds = [...new Set(receivedPayments.map((payment) => payment.studioServiceId).filter((id): id is string => Boolean(id)))];
    const outsideServices = receivedServiceIds.length ? await this.services.find({ where: { id: In(receivedServiceIds) } }) : [];
    const serviceById = new Map([...services, ...outsideServices].map((service) => [service.id, service]));
    const customerIds = [...new Set([...serviceById.values()].map(({ customerId }) => customerId))];
    const customers = customerIds.length ? await this.customers.find({ where: { id: In(customerIds) } }) : [];
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const servicePaid = new Map<string, number>();
    for (const payment of allServicePayments) {
      if (payment.studioServiceId) servicePaid.set(payment.studioServiceId, (servicePaid.get(payment.studioServiceId) ?? 0) + Number(payment.amount));
    }

    const userIds = [...new Set([...work.map(({ photographerUserId }) => photographerUserId), ...tasks.map(({ photographerUserId }) => photographerUserId), ...receivedPayments.map(({ recordedByUserId }) => recordedByUserId)])];
    const users = userIds.length ? await this.users.find({ where: { id: In(userIds) } }) : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const taskPhotoTotals = new Map<string, number>();
    for (const task of tasks) {
      if (task.status === PhotographerTaskStatus.COMPLETED) taskPhotoTotals.set(task.photographerUserId, (taskPhotoTotals.get(task.photographerUserId) ?? 0) + (task.editedPhotos ?? 0));
    }
    const photographerIds = [...new Set([...tasks.map(({ photographerUserId }) => photographerUserId), ...work.map(({ photographerUserId }) => photographerUserId)])];

    const clientRows = services.map((service) => {
      const customer = customerById.get(service.customerId);
      const paidAmount = servicePaid.get(service.id) ?? 0;
      const totalAmount = Number(service.totalAmount);
      return {
        id: service.id,
        customerId: service.customerId,
        customerName: customer?.name ?? 'Unknown customer',
        phoneNumber: customer?.phone ?? '',
        serviceDate: service.serviceDate,
        photosTaken: service.photosTaken,
        softPhotos: service.softPhotos,
        hardPhotos: service.hardPhotos,
        totalAmount,
        paidAmount,
        remainingAmount: Math.max(0, totalAmount - paidAmount),
        paymentStatus: paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        serviceStatus: service.status,
        needsUrgentService: service.needsUrgentService,
        recordedByUserId: service.recordedByUserId,
        createdAt: service.createdAt,
      };
    });

    return {
      summary: {
        clientCount: clientRows.length,
        photosTaken: clientRows.reduce((sum, row) => sum + row.photosTaken, 0),
        moneyReceived: receivedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      },
      clients: clientRows,
      servedClients: clientRows.filter((client) => client.serviceStatus === StudioServiceStatus.SERVED),
      urgentClients: clientRows.filter((client) => client.needsUrgentService && client.serviceStatus !== StudioServiceStatus.SERVED),
      payments: receivedPayments.map((payment) => {
        const service = payment.studioServiceId ? serviceById.get(payment.studioServiceId) : undefined;
        const customer = service ? customerById.get(service.customerId) : undefined;
        return { id: payment.id, customerName: customer?.name ?? 'Unknown customer', amount: Number(payment.amount), currency: payment.currency, method: payment.method, reference: payment.reference, receivedAt: payment.createdAt, receivedBy: userById.get(payment.recordedByUserId)?.fullName ?? 'Unknown cashier' };
      }),
      photographerTotals: photographerIds.map((id) => ({ photographerUserId: id, photographerName: userById.get(id)?.fullName ?? 'Unknown photographer', photosAssigned: tasks.filter((task) => task.photographerUserId === id).reduce((sum, task) => sum + task.photosToEdit, 0), photosEdited: taskPhotoTotals.get(id) ?? work.filter((entry) => entry.photographerUserId === id).reduce((sum, entry) => sum + entry.editedPhotos, 0) })),
      photographerTasks: tasks.map((task) => ({ ...task, photographerName: userById.get(task.photographerUserId)?.fullName ?? 'Unknown photographer', customerName: customerById.get(serviceById.get(task.studioServiceId)?.customerId ?? '')?.name ?? 'Unknown customer' })),
      photographerWork: work.map((entry) => ({ id: entry.id, photographerUserId: entry.photographerUserId, photographerName: userById.get(entry.photographerUserId)?.fullName ?? 'Unknown photographer', workDate: entry.workDate, editedPhotos: entry.editedPhotos, notes: entry.notes, createdAt: entry.createdAt })),
    };
  }

  async createService(data: CreateStudioServiceDto, actor: AuthUser) {
    const customer = await this.customers.findOne({ where: { id: data.customerId } });
    if (!customer || !customer.isActive) throw new NotFoundException('Active customer not found.');
    return this.services.save(this.services.create({ customerId: customer.id, serviceDate: data.serviceDate, photosTaken: data.photosTaken, softPhotos: data.softPhotos, hardPhotos: data.hardPhotos, totalAmount: data.totalAmount, needsUrgentService: data.needsUrgentService ?? false, status: StudioServiceStatus.IN_PROGRESS, recordedByUserId: actor.id }));
  }

  async updateServiceStatus(id: string, status: StudioServiceStatus) {
    const service = await this.services.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Studio service record not found.');
    if (status === StudioServiceStatus.SERVED) {
      const [payments, tasks] = await Promise.all([
        this.payments.find({ where: { studioServiceId: id, status: PaymentStatus.COMPLETED } }),
        this.tasks.find({ where: { studioServiceId: id } }),
      ]);
      const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      if (paid < Number(service.totalAmount)) throw new BadRequestException('The client must pay the full agreed amount before being marked served.');
      if (tasks.some((task) => task.status !== PhotographerTaskStatus.COMPLETED)) throw new BadRequestException('All assigned editing tasks must be completed before the client is marked served.');
    }
    service.status = status;
    if (status === StudioServiceStatus.SERVED) service.needsUrgentService = false;
    return this.services.save(service);
  }

  async updateServicePriority(id: string, needsUrgentService: boolean) {
    const service = await this.services.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Studio service record not found.');
    if (service.status === StudioServiceStatus.SERVED && needsUrgentService) throw new BadRequestException('Served clients cannot be added to the urgent queue.');
    service.needsUrgentService = needsUrgentService;
    return this.services.save(service);
  }

  listPhotographers() {
    return this.users.find({ where: { role: Role.PHOTOGRAPHER, isActive: true }, select: { id: true, fullName: true }, order: { fullName: 'ASC' } });
  }

  async listUnfinishedClients() {
    const services = await this.services.find({ where: { status: StudioServiceStatus.IN_PROGRESS }, order: { serviceDate: 'DESC', createdAt: 'DESC' } });
    const customerIds = [...new Set(services.map(({ customerId }) => customerId))];
    const customers = customerIds.length ? await this.customers.find({ where: { id: In(customerIds) } }) : [];
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    return services.map((service) => ({
      id: service.id,
      customerId: service.customerId,
      customerName: customerById.get(service.customerId)?.name ?? 'Unknown customer',
      phoneNumber: customerById.get(service.customerId)?.phone ?? '',
      serviceDate: service.serviceDate,
      photosTaken: service.photosTaken,
      status: service.status,
    }));
  }

  async createTask(data: CreatePhotographerTaskDto, actor: AuthUser) {
    const [service, photographer] = await Promise.all([
      this.services.findOne({ where: { id: data.studioServiceId } }),
      this.users.findOne({ where: { id: data.photographerUserId, role: Role.PHOTOGRAPHER, isActive: true } }),
    ]);
    if (!service) throw new NotFoundException('Studio service record not found.');
    if (!photographer) throw new NotFoundException('Active photographer not found.');
    if (service.status === StudioServiceStatus.SERVED) throw new BadRequestException('Served clients cannot receive editing tasks.');
    const existing = await this.tasks.find({ where: { studioServiceId: service.id } });
    const assigned = existing.reduce((sum, task) => sum + task.photosToEdit, 0);
    if (assigned + data.photosToEdit > service.photosTaken) throw new BadRequestException('Assigned photos cannot exceed the number taken for this client.');
    service.status = StudioServiceStatus.IN_PROGRESS;
    await this.services.save(service);
    return this.tasks.save(this.tasks.create({ ...data, status: PhotographerTaskStatus.ASSIGNED, assignedByUserId: actor.id }));
  }

  async getMyTasks(actor: AuthUser) {
    const tasks = await this.tasks.find({ where: { photographerUserId: actor.id }, order: { taskDate: 'ASC', createdAt: 'DESC' } });
    const serviceIds = [...new Set(tasks.map(({ studioServiceId }) => studioServiceId))];
    const services = serviceIds.length ? await this.services.find({ where: { id: In(serviceIds) } }) : [];
    const customerIds = [...new Set(services.map(({ customerId }) => customerId))];
    const customers = customerIds.length ? await this.customers.find({ where: { id: In(customerIds) } }) : [];
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    return tasks.map((task) => ({ ...task, customerName: customerById.get(serviceById.get(task.studioServiceId)?.customerId ?? '')?.name ?? 'Unknown customer' }));
  }

  async getCompletedTasks(actor: AuthUser) {
    const where = actor.role === Role.CASHIER
      ? { assignedByUserId: actor.id, status: PhotographerTaskStatus.COMPLETED }
      : { status: PhotographerTaskStatus.COMPLETED };
    const tasks = await this.tasks.find({ where, order: { completedAt: 'DESC' } });
    const serviceIds = [...new Set(tasks.map(({ studioServiceId }) => studioServiceId))];
    const photographerIds = [...new Set(tasks.map(({ photographerUserId }) => photographerUserId))];
    const [services, photographers] = await Promise.all([
      serviceIds.length ? this.services.find({ where: { id: In(serviceIds) } }) : Promise.resolve([]),
      photographerIds.length ? this.users.find({ where: { id: In(photographerIds) } }) : Promise.resolve([]),
    ]);
    const customerIds = [...new Set(services.map(({ customerId }) => customerId))];
    const customers = customerIds.length ? await this.customers.find({ where: { id: In(customerIds) } }) : [];
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    const photographerById = new Map(photographers.map((user) => [user.id, user]));
    return tasks.map((task) => ({
      ...task,
      customerName: customerById.get(serviceById.get(task.studioServiceId)?.customerId ?? '')?.name ?? 'Unknown customer',
      photographerName: photographerById.get(task.photographerUserId)?.fullName ?? 'Unknown photographer',
    }));
  }

  async markTaskRead(id: string, actor: AuthUser) {
    const task = await this.tasks.findOne({ where: { id, photographerUserId: actor.id } });
    if (!task) throw new NotFoundException('Assigned task not found.');
    if (!task.readAt) task.readAt = new Date();
    return this.tasks.save(task);
  }

  async updateTask(id: string, data: UpdatePhotographerTaskDto, actor: AuthUser) {
    const task = await this.tasks.findOne({ where: { id, photographerUserId: actor.id } });
    if (!task) throw new NotFoundException('Assigned task not found.');
    if (data.status === PhotographerTaskStatus.COMPLETED) {
      if (task.status === PhotographerTaskStatus.COMPLETED) throw new BadRequestException('This task has already been completed.');
      if (data.editedPhotos === undefined) throw new BadRequestException('Enter the number of photos edited before completing the task.');
      if (data.editedPhotos > task.photosToEdit) throw new BadRequestException('Edited photos cannot exceed the assigned amount.');
      task.editedPhotos = data.editedPhotos;
      task.completedAt = new Date();
    } else if (task.status === PhotographerTaskStatus.COMPLETED) {
      throw new BadRequestException('Completed tasks cannot be reopened.');
    }
    task.status = data.status;
    return this.tasks.save(task);
  }

  createPhotographerWork(data: CreatePhotographerWorkDto, actor: AuthUser) {
    return this.photographerWork.save(this.photographerWork.create({ photographerUserId: actor.id, workDate: data.workDate, editedPhotos: data.editedPhotos, notes: data.notes?.trim() || undefined }));
  }
}
