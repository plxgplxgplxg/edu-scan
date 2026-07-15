/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from '../../../../../src/modules/submissions/services/submissions.service';
import { SubmissionsRepository } from '../../../../../src/modules/submissions/repositories/submissions.repository';
import { PrismaService } from '../../../../../src/database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
  AnswerChoice,
} from '@prisma/client';

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
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            user: {
              findUnique: jest.fn(),
            },
            submission: {
              update: jest.fn(),
            },
            submissionDetail: {
              update: jest.fn(),
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
        service.findOneWithScore('invalid-id', {
          id: 'admin1',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student accesses another student submission', async () => {
      jest.spyOn(repository, 'findOneWithDetails').mockResolvedValue({
        id: 'sub-1',
        studentId: 'other-student',
        details: [],
      } as any);

      await expect(
        service.findOneWithScore('sub-1', {
          id: 'my-student',
          role: Role.STUDENT,
        }),
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

      jest
        .spyOn(repository, 'findOneWithDetails')
        .mockResolvedValue(mockSubmission as any);

      const result = await service.findOneWithScore('sub-1', {
        id: 'teacher-1',
        role: Role.TEACHER,
      });

      expect(result.score.totalCorrect).toBe(1);
      expect(result.score.maxScore).toBe(10);
      expect(result.score.calculatedScore).toBe(5); // 1 out of 2 correct, max 10
      expect(result.details[0].isCorrect).toBe(true);
      expect(result.details[1].isCorrect).toBe(false);
    });
  });

  describe('manualOverride', () => {
    it('should update submission correctly', async () => {
      const mockSubmission = {
        id: 'sub-1',
        details: [
          {
            submissionId: 'sub-1',
            questionNumber: 1,
            finalAnswer: AnswerChoice.A,
          },
        ],
        exam: { maxScore: 10 },
      };
      jest
        .spyOn(repository, 'findOneWithDetails')
        .mockResolvedValue(mockSubmission as any);
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'student-1' }),
        },
        submission: {
          update: jest.fn().mockResolvedValue({
            ...mockSubmission,
            status: SubmissionStatus.GRADED,
          }),
        },
        submissionDetail: {
          update: jest.fn().mockResolvedValue({
            questionNumber: 1,
            finalAnswer: AnswerChoice.B,
            isCorrect: true,
            needsReview: false,
          }),
        },
        examVariant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'variant-1',
            answerKeys: [{ questionNumber: 1, correctAnswer: AnswerChoice.B }],
          }),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
        cb(tx),
      );

      const dto = {
        studentCode: '12345',
        resolvedVariantId: 'variant-1',
        details: [{ questionNumber: 1, finalAnswer: AnswerChoice.B }],
      };

      await service.manualOverride('sub-1', dto);

      expect(tx.user.findUnique).toHaveBeenCalledWith({
        where: { studentCode: '12345' },
      });
      expect(tx.submission.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          studentId: 'student-1',
          studentCode: '12345',
          resolvedVariantId: 'variant-1',
          testCodeResolutionStatus: TestCodeResolutionStatus.MATCHED,
        }),
      });
      expect(tx.submission.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          status: SubmissionStatus.GRADED,
        }),
      });
      expect(tx.submissionDetail.update).toHaveBeenCalledWith({
        where: {
          submissionId_questionNumber: {
            submissionId: 'sub-1',
            questionNumber: 1,
          },
        },
        data: expect.objectContaining({
          finalAnswer: AnswerChoice.B,
        }),
      });
    });
  });
});
