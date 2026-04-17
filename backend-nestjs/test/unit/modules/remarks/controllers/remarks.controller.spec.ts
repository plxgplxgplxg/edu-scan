import { Test, TestingModule } from '@nestjs/testing';
import { RemarksController } from '../../../../../src/modules/remarks/controllers/remarks.controller';
import { RemarksService } from '../../../../../src/modules/remarks/services/remarks.service';
import { CreateRemarkRequestDto } from '../../../../../src/modules/remarks/dtos/create-remark.dto';
import { ReviewRemarkRequestDto } from '../../../../../src/modules/remarks/dtos/review-remark.dto';
import { RemarkStatus, AnswerChoice } from '@prisma/client';

describe('RemarksController', () => {
  let controller: RemarksController;
  let service: jest.Mocked<RemarksService>;

  const mockService = {
    createRemark: jest.fn(),
    getRemarks: jest.fn(),
    reviewRemark: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemarksController],
      providers: [
        { provide: RemarksService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<RemarksController>(RemarksController);
    service = module.get(RemarksService);
    jest.clearAllMocks();
  });

  describe('createRemark (Student)', () => {
    it('should call service with studentId and return result', async () => {
      const mockReq = { user: { id: 'student-id' } };
      const dto: CreateRemarkRequestDto = { submissionDetailId: 'detail', reason: 'reason' };
      service.createRemark.mockResolvedValue({ id: 'remark-id' } as any);

      const result = await controller.createRemark(mockReq, dto);

      expect(result).toEqual({ message: 'Remark request created successfully', data: { id: 'remark-id' } });
      expect(service.createRemark).toHaveBeenCalledWith('student-id', dto);
    });
  });

  describe('getRemarks (Teacher)', () => {
    it('should call service and return list of remarks', async () => {
      service.getRemarks.mockResolvedValue([{ id: 'remark-id' }] as any);

      const result = await controller.getRemarks(RemarkStatus.PENDING);

      expect(result).toEqual({ message: 'Remarks retrieved successfully', data: [{ id: 'remark-id' }] });
      expect(service.getRemarks).toHaveBeenCalledWith(RemarkStatus.PENDING);
    });
  });

  describe('reviewRemark (Teacher)', () => {
    it('should call service with teacherId and payload', async () => {
      const mockReq = { user: { id: 'teacher-id' } };
      const dto: ReviewRemarkRequestDto = { status: RemarkStatus.APPROVED, finalAnswer: AnswerChoice.B };
      service.reviewRemark.mockResolvedValue({ id: 'remark-id', status: RemarkStatus.APPROVED } as any);

      const result = await controller.reviewRemark('remark-id', mockReq, dto);

      expect(result).toEqual({ message: 'Remark reviewed successfully', data: { id: 'remark-id', status: RemarkStatus.APPROVED } });
      expect(service.reviewRemark).toHaveBeenCalledWith('remark-id', 'teacher-id', dto);
    });
  });
});
