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
            updateSubmissionDetail: jest.fn(),
            findStudentSubmissionsPaginated: jest.fn(),
            countStudentSubmissions: jest.fn(),
            findStudentSubmissionsForProgress: jest.fn(),
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
      const mockSubmission = { id: 'sub-1', details: [] };
      jest
        .spyOn(repository, 'findOneWithDetails')
        .mockResolvedValue(mockSubmission as any);
      const updateSpy = jest.spyOn(repository, 'update').mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.GRADED,
      } as any);
      const findUniqueSpy = jest
        .spyOn(prisma.user, 'findUnique')
        .mockResolvedValue({ id: 'student-1' } as any);
      const updateSubmissionDetailSpy = jest.spyOn(
        repository,
        'updateSubmissionDetail',
      );

      const dto = {
        studentCode: '12345',
        resolvedVariantId: 'variant-1',
        details: [{ questionNumber: 1, finalAnswer: AnswerChoice.B }],
      };

      await service.manualOverride('sub-1', dto);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { studentCode: '12345' },
      });
      expect(updateSpy).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          studentId: 'student-1',
          studentCode: '12345',
          resolvedVariantId: 'variant-1',
          testCodeResolutionStatus: TestCodeResolutionStatus.MATCHED,
          status: SubmissionStatus.GRADED,
        }),
      );
      expect(updateSubmissionDetailSpy).toHaveBeenCalledWith('sub-1', 1, {
        finalAnswer: AnswerChoice.B,
      });
    });
  });

  describe('findMySubmissions', () => {
    it('should reject non-student users', async () => {
      await expect(
        service.findMySubmissions(
          { id: 'teacher-1', role: Role.TEACHER },
          {} as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty state when student has no submissions', async () => {
      jest
        .spyOn(repository, 'findStudentSubmissionsPaginated')
        .mockResolvedValue([] as any);
      jest.spyOn(repository, 'countStudentSubmissions').mockResolvedValue(0);

      const result = await service.findMySubmissions(
        { id: 'student-1', role: Role.STUDENT },
        {},
      );

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('getMyProgress', () => {
    it('should return empty array when student has no submissions', async () => {
      jest
        .spyOn(repository, 'findStudentSubmissionsForProgress')
        .mockResolvedValue([] as any);

      const result = await service.getMyProgress({
        id: 'student-1',
        role: Role.STUDENT,
      });

      expect(result).toEqual([]);
    });

    it('should return progress payload in expected format', async () => {
      jest
        .spyOn(repository, 'findStudentSubmissionsForProgress')
        .mockResolvedValue([
          {
            id: 'sub-1',
            status: SubmissionStatus.NEEDS_REVIEW,
            createdAt: new Date('2026-04-10T10:00:00.000Z'),
            reviewedAt: null,
            exam: {
              id: 'exam-1',
              title: 'Midterm',
              maxScore: 10,
            },
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
          },
        ] as any);

      const result = await service.getMyProgress({
        id: 'student-1',
        role: Role.STUDENT,
      });

      expect(result).toEqual([
        {
          date: '2026-04-10T10:00:00.000Z',
          score: 5,
          maxScore: 10,
          examId: 'exam-1',
          examTitle: 'Midterm',
          submissionId: 'sub-1',
          status: SubmissionStatus.NEEDS_REVIEW,
          needsReview: true,
          reviewNote: 'Pending manual review',
        },
      ]);
    });
  });
});
