import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { SubmissionsRepository } from '../repositories/submissions.repository';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role, SubmissionStatus, TestCodeResolutionStatus, AnswerChoice } from '@prisma/client';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let repository: SubmissionsRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: SubmissionsRepository,
          useValue: {
            findAll: jest.fn(),
            findOneWithDetails: jest.fn(),
            update: jest.fn(),
            updateSubmissionDetail: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    repository = module.get<SubmissionsRepository>(SubmissionsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneWithScore', () => {
    it('should throw NotFoundException if submission not found', async () => {
      jest.spyOn(repository, 'findOneWithDetails').mockResolvedValue(null);
      await expect(
        service.findOneWithScore('invalid-id', { id: 'admin1', role: Role.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student accesses another student submission', async () => {
      jest.spyOn(repository, 'findOneWithDetails').mockResolvedValue({
        id: 'sub-1',
        studentId: 'other-student',
        details: [],
      } as any);

      await expect(
        service.findOneWithScore('sub-1', { id: 'my-student', role: Role.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should calculate score correctly', async () => {
      const mockSubmission = {
        id: 'sub-1',
        studentId: 'student-1',
        exam: { id: 'exam-1', maxScore: 10 },
        details: [
          { questionNumber: 1, finalAnswer: AnswerChoice.A },
          { questionNumber: 2, finalAnswer: AnswerChoice.B },
        ],
        resolvedVariant: {
          answerKeys: [
            { questionNumber: 1, correctAnswer: AnswerChoice.A },
            { questionNumber: 2, correctAnswer: AnswerChoice.C },
          ],
        },
      };

      jest.spyOn(repository, 'findOneWithDetails').mockResolvedValue(mockSubmission as any);

      const result = await service.findOneWithScore('sub-1', { id: 'teacher-1', role: Role.TEACHER });

      expect(result.score.totalCorrect).toBe(1);
      expect(result.score.maxScore).toBe(10);
      expect(result.score.calculatedScore).toBe(5); // 1 out of 2 correct, max 10
      expect(result.details[0].isCorrect).toBe(true);
      expect(result.details[1].isCorrect).toBe(false);
    });
  });

  describe('manualOverride', () => {
    it('should update submission correctly', async () => {
      const mockSubmission = { id: 'sub-1', details: [] };
      jest.spyOn(repository, 'findOneWithDetails').mockResolvedValue(mockSubmission as any);
      jest.spyOn(repository, 'update').mockResolvedValue({ ...mockSubmission, status: SubmissionStatus.GRADED } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'student-1' } as any);
      
      const dto = {
        studentCode: '12345',
        resolvedVariantId: 'variant-1',
        details: [{ questionNumber: 1, finalAnswer: AnswerChoice.B }],
      };

      await service.manualOverride('sub-1', dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { studentCode: '12345' } });
      expect(repository.update).toHaveBeenCalledWith('sub-1', expect.objectContaining({
        studentId: 'student-1',
        studentCode: '12345',
        resolvedVariantId: 'variant-1',
        testCodeResolutionStatus: TestCodeResolutionStatus.MATCHED,
        status: SubmissionStatus.GRADED,
      }));
      expect(repository.updateSubmissionDetail).toHaveBeenCalledWith('sub-1', 1, { finalAnswer: AnswerChoice.B });
    });
  });
});
