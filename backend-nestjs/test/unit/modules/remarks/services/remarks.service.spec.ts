import { Test, TestingModule } from '@nestjs/testing';
import { RemarksService } from '../../../../../src/modules/remarks/services/remarks.service';
import { RemarksRepository } from '../../../../../src/modules/remarks/repositories/remarks.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RemarkStatus, AnswerChoice } from '@prisma/client';

describe('RemarksService', () => {
  let service: RemarksService;
  let repository: jest.Mocked<RemarksRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockRepository = {
    findSubmissionDetail: jest.fn(),
    findPendingRemarkForDetail: jest.fn(),
    createRemark: jest.fn(),
    findAllRemarks: jest.fn(),
    findRemarkById: jest.fn(),
    updateRemark: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemarksService,
        { provide: RemarksRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RemarksService>(RemarksService);
    repository = module.get(RemarksRepository);
    eventEmitter = module.get(EventEmitter2);
    jest.clearAllMocks();
  });

  describe('createRemark', () => {
    const studentId = 'student-id';
    const dto = { submissionDetailId: 'detail-id', reason: 'I am right' };

    it('should throw NotFoundException if submission detail does not exist or belong to student', async () => {
      repository.findSubmissionDetail.mockResolvedValue(null);

      await expect(service.createRemark(studentId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if a pending remark already exists', async () => {
      repository.findSubmissionDetail.mockResolvedValue({ id: 'detail-id' } as any);
      repository.findPendingRemarkForDetail.mockResolvedValue({ id: 'existing-remark' } as any);

      await expect(service.createRemark(studentId, dto)).rejects.toThrow(ConflictException);
    });

    it('should create and return a PENDING remark', async () => {
      repository.findSubmissionDetail.mockResolvedValue({ id: 'detail-id' } as any);
      repository.findPendingRemarkForDetail.mockResolvedValue(null);
      const expectedRemark = { id: 'new-remark', status: RemarkStatus.PENDING };
      repository.createRemark.mockResolvedValue(expectedRemark as any);

      const result = await service.createRemark(studentId, dto);

      expect(result).toEqual(expectedRemark);
      expect(repository.createRemark).toHaveBeenCalledWith(studentId, dto);
    });
  });

  describe('reviewRemark', () => {
    const teacherId = 'teacher-id';
    const remarkId = 'remark-id';

    it('should throw NotFoundException if remark is not found', async () => {
      repository.findRemarkById.mockResolvedValue(null);

      await expect(service.reviewRemark(remarkId, teacherId, { status: RemarkStatus.APPROVED })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if remark is not PENDING', async () => {
      repository.findRemarkById.mockResolvedValue({ status: RemarkStatus.APPROVED } as any);

      await expect(service.reviewRemark(remarkId, teacherId, { status: RemarkStatus.REJECTED })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if approving without finalAnswer', async () => {
      repository.findRemarkById.mockResolvedValue({ status: RemarkStatus.PENDING } as any);

      await expect(service.reviewRemark(remarkId, teacherId, { status: RemarkStatus.APPROVED })).rejects.toThrow(BadRequestException);
    });

    it('should reject remark and not emit event', async () => {
      repository.findRemarkById.mockResolvedValue({ status: RemarkStatus.PENDING } as any);
      const updatedRemark = { id: remarkId, status: RemarkStatus.REJECTED };
      repository.updateRemark.mockResolvedValue(updatedRemark as any);

      const result = await service.reviewRemark(remarkId, teacherId, { status: RemarkStatus.REJECTED, teacherComment: 'Wrong' });

      expect(result).toEqual(updatedRemark);
      expect(repository.updateRemark).toHaveBeenCalledWith(remarkId, {
        status: RemarkStatus.REJECTED,
        reviewer: { connect: { id: teacherId } },
        teacherComment: 'Wrong',
        reviewedAt: expect.any(Date),
      });
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should approve remark and emit event', async () => {
      const mockRemark = { id: remarkId, submissionDetailId: 'detail-id', status: RemarkStatus.PENDING };
      repository.findRemarkById.mockResolvedValue(mockRemark as any);
      const updatedRemark = { id: remarkId, status: RemarkStatus.APPROVED };
      repository.updateRemark.mockResolvedValue(updatedRemark as any);

      const result = await service.reviewRemark(remarkId, teacherId, {
        status: RemarkStatus.APPROVED,
        finalAnswer: AnswerChoice.A,
      });

      expect(result).toEqual(updatedRemark);
      expect(repository.updateRemark).toHaveBeenCalledWith(remarkId, {
        status: RemarkStatus.APPROVED,
        reviewer: { connect: { id: teacherId } },
        teacherComment: undefined,
        reviewedAt: expect.any(Date),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('remark.approved', expect.objectContaining({
        submissionDetailId: 'detail-id',
        finalAnswer: AnswerChoice.A,
      }));
    });
  });
});
