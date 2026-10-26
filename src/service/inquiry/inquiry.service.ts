import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthUser } from '../../application/auth-user';
import { CreateInquiryDto } from '../../controller/inquiry/inquiry.dto';
import { InquiryEntity } from '../../persistence/inquiry/inquiry.entity';

@Injectable()
export class InquiryService {
  constructor(
    @InjectRepository(InquiryEntity)
    private readonly inquiries: Repository<InquiryEntity>,
  ) {}

  create(data: CreateInquiryDto): Promise<InquiryEntity> {
    return this.inquiries.save(this.inquiries.create({
      ...data,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      service: data.service.trim(),
      message: data.message?.trim() || undefined,
    }));
  }

  async findOne(id: string): Promise<InquiryEntity> {
    const inquiry = await this.inquiries.findOneBy({ id });
    if (!inquiry) throw new NotFoundException('Client enquiry was not found.');
    return inquiry;
  }

  list(): Promise<InquiryEntity[]> {
    return this.inquiries.find({ order: { createdAt: 'DESC' } });
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
