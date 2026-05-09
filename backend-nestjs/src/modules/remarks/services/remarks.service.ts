import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RemarksRepository } from '../repositories/remarks.repository';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { ReviewRemarkRequestDto } from '../dtos/review-remark.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RemarkStatus } from '@prisma/client';
import { RemarkApprovedEvent } from '../events/remark-approved.event';

@Injectable()
export class RemarksService {
  constructor(
    private readonly remarksRepository: RemarksRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRemark(studentId: string, dto: CreateRemarkRequestDto) {
    const detail = await this.remarksRepository.findSubmissionDetail(
      dto.submissionDetailId,
      studentId,
    );
    if (!detail) {
      throw new NotFoundException(
        'Submission detail not found or does not belong to you',
      );
    }

    const pendingRemark =
      await this.remarksRepository.findPendingRemarkForDetail(
        dto.submissionDetailId,
        studentId,
      );
    if (pendingRemark) {
      throw new ConflictException(
        'You already have a pending remark request for this question',
      );
    }

    return this.remarksRepository.createRemark(studentId, dto);
  }

  async getRemarks(status?: RemarkStatus) {
    return this.remarksRepository.findAllRemarks(status);
  }

  async getMyRemarks(studentId: string) {
    return this.remarksRepository.findStudentRemarks(studentId);
  }

  async reviewRemark(
    remarkId: string,
    teacherId: string,
    dto: ReviewRemarkRequestDto,
  ) {
    const remark = await this.remarksRepository.findRemarkById(remarkId);
    if (!remark) {
      throw new NotFoundException('Remark request not found');
    }

    if (remark.status !== RemarkStatus.PENDING) {
      throw new ConflictException(`Remark request is already ${remark.status}`);
    }

    if (dto.status === RemarkStatus.APPROVED && !dto.finalAnswer) {
      throw new BadRequestException(
        'finalAnswer is required when approving a remark request',
      );
    }

    const updatedRemark = await this.remarksRepository.updateRemark(remarkId, {
      status: dto.status,
      reviewer: { connect: { id: teacherId } },
      teacherComment: dto.teacherComment,
      reviewedAt: new Date(),
    });

    if (dto.status === RemarkStatus.APPROVED) {
      this.eventEmitter.emit(
        'remark.approved',
        new RemarkApprovedEvent(remark.submissionDetailId, dto.finalAnswer!),
      );
    }

    return updatedRemark;
  }
}
