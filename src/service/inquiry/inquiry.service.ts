import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../application/auth-user';
import { CreateInquiryDto } from '../../controller/inquiry/inquiry.dto';
import { InquiryEntity } from '../../persistence/inquiry/inquiry.entity';
import { PushNotificationService } from '../notification/push-notification.service';

@Injectable()
export class InquiryService {
  constructor(
    @InjectRepository(InquiryEntity)
    private readonly inquiries: Repository<InquiryEntity>,
    @Optional() private readonly notifications?: PushNotificationService,
  ) {}

  async create(data: CreateInquiryDto): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.save(this.inquiries.create({
      ...data,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      service: data.service.trim(),
      message: data.message?.trim() || undefined,
    }));
    const dateText = inquiry.preferredDate ? ` for ${inquiry.preferredDate}` : '';
    await this.notifications?.notifyManagers(
      'New client message',
      `${inquiry.name} · ${inquiry.service}${dateText}`,
      {
        type: 'client_message',
        inquiryId: inquiry.id,
        route: `/inquiries/${inquiry.id}`,
      },
    );
    return inquiry;
  }

  async findOne(id: string): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOneBy({ id });
    if (!inquiry) throw new NotFoundException('Client enquiry was not found.');
    return inquiry;
  }

  list(): Promise<InquiryEntity[]> {
    return this.inquiries.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  async markRead(id: string, actor: AuthUser): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOneBy({ id });
    if (!inquiry) throw new NotFoundException('Client enquiry was not found.');
    if (!inquiry.isRead) {
      inquiry.isRead = true;
      inquiry.readByUserId = actor.id;
      inquiry.readAt = new Date();
      await this.inquiries.save(inquiry);
    }
    return inquiry;
  }
}
