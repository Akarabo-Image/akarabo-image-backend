import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Role } from '../../util/roles';
import { InquiryEntity } from '../../persistence/inquiry/inquiry.entity';
import { InquiryService } from './inquiry.service';

describe('InquiryService', () => {
  let service: InquiryService;
  let repository: jest.Mocked<Pick<Repository<InquiryEntity>, 'create' | 'save' | 'find' | 'findOneBy'>>;

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value as InquiryEntity),
      save: jest.fn(async (value) => value as InquiryEntity),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn(),
    };
    service = new InquiryService(repository as unknown as Repository<InquiryEntity>);
  });

  it('normalises and stores a public enquiry', async () => {
    await service.create({ name: '  Alex Client ', email: ' ALEX@EXAMPLE.COM ', service: ' Wedding ', message: '  Details  ' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Alex Client', email: 'alex@example.com', service: 'Wedding', message: 'Details',
    }));
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('returns newest enquiries first, capped at 50', async () => {
    await service.list();
    expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 50 });
  });

  it('marks an enquiry read and records which studio user saw it', async () => {
    const enquiry = { id: 'inquiry-id', isRead: false } as InquiryEntity;
    repository.findOneBy.mockResolvedValue(enquiry);
    await service.markRead(enquiry.id, { id: 'cashier-id', email: 'cashier@test.rw', role: Role.CASHIER });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      isRead: true, readByUserId: 'cashier-id', readAt: expect.any(Date),
    }));
  });

  it('reports a missing enquiry', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.markRead('missing', { id: 'staff', email: 'staff@test.rw', role: Role.MANAGER }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
