import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AUDIT_REPOSITORY } from '../../application/audit/audit.repository.interface';
import { auditRepositoryMock } from '../../application/audit/audit.repository.mock';
import { AuditServiceImpl } from './audit.service';

describe('AuditService', () => {
  let service: AuditServiceImpl;
  let repository: jest.Mocked<ReturnType<typeof auditRepositoryMock>>;

  beforeEach(async () => {
    repository = auditRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditServiceImpl,
        { provide: AUDIT_REPOSITORY, useValue: repository },
      ],
    }).compile();

    service = module.get(AuditServiceImpl);
  });

  describe('log', () => {
    it('persists the entry through the repository', async () => {
      await service.log({ action: 'LOGIN', entity: 'Auth', userId: 'u1' });

      expect(repository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN', entity: 'Auth' }),
      );
    });

    it('never breaks the calling operation when the write fails', async () => {
      // The failure is logged with a full stack — silence it for clean output.
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      repository.insert.mockRejectedValueOnce(new Error('database down'));

      await expect(
        service.log({ action: 'LOGIN', entity: 'Auth' }),
      ).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('findByEntity', () => {
    it('delegates to the repository', async () => {
      await service.findByEntity('Booking', 'b1');

      expect(repository.findByEntity).toHaveBeenCalledWith('Booking', 'b1');
    });
  });

  describe('findByUser', () => {
    it('delegates to the repository with the given limit', async () => {
      await service.findByUser('u1', 10);

      expect(repository.findByUser).toHaveBeenCalledWith('u1', 10);
    });
  });
});
