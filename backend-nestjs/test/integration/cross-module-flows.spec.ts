import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { AnswerChoice, RemarkStatus } from '@prisma/client';
import { RemarksService } from '../../src/modules/remarks/services/remarks.service';
import { RemarksRepository } from '../../src/modules/remarks/repositories/remarks.repository';
import { SubmissionsService } from '../../src/modules/submissions/services/submissions.service';
import { SubmissionsRepository } from '../../src/modules/submissions/repositories/submissions.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { OmrQueueProcessor } from '../../src/modules/omr/processors/omr-queue.processor';
import { OmrProcessor } from '../../src/modules/omr/processors/omr.processor';
import { OmrBatchStateUpdaterService } from '../../src/modules/omr/services/omr-batch-state-updater.service';
import { BatchService } from '../../src/modules/omr/services/batch.service';
import { OmrRepository } from '../../src/modules/omr/repositories/omr.repository';
import { GradingService } from '../../src/modules/omr/services/grading.service';
import { SseRegistryService } from '../../src/modules/omr/services/sse-registry.service';
import { QuestionsService } from '../../src/modules/questions/services/questions.service';
import { QuestionsRepository } from '../../src/modules/questions/repositories/questions.repository';
import { ExamsService } from '../../src/modules/exams/services/exams.service';
import { ExamsRepository } from '../../src/modules/exams/repositories/exams.repository';

describe('Cross-module hardening flows', () => {
  describe('remark approved -> submission detail update -> notification event', () => {
    it('updates detail and emits submission.detail.updated', async () => {
      const remarksRepository = {
        findRemarkById: jest.fn().mockResolvedValue({
          id: 'remark-1',
          status: RemarkStatus.PENDING,
          submissionDetailId: 'detail-1',
        }),
        updateRemark: jest.fn().mockResolvedValue({
          id: 'remark-1',
          status: RemarkStatus.APPROVED,
        }),
      };

      const submissionsRepository = {
        updateSubmissionDetail: jest.fn().mockResolvedValue({}),
      };

      const prismaService = {
        submissionDetail: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'detail-1',
            submissionId: 'sub-1',
            questionNumber: 3,
          }),
        },
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot()],
        providers: [
          RemarksService,
          SubmissionsService,
          { provide: RemarksRepository, useValue: remarksRepository },
          { provide: SubmissionsRepository, useValue: submissionsRepository },
          { provide: PrismaService, useValue: prismaService },
        ],
      }).compile();

      await moduleRef.init();

      const remarksService = moduleRef.get(RemarksService);
      const eventEmitter = moduleRef.get(EventEmitter2);
      const notificationSpy = jest.fn();
      eventEmitter.on('submission.detail.updated', notificationSpy);

      await remarksService.reviewRemark('remark-1', 'teacher-1', {
        status: RemarkStatus.APPROVED,
        finalAnswer: AnswerChoice.B,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(submissionsRepository.updateSubmissionDetail).toHaveBeenCalledWith(
        'sub-1',
        3,
        { finalAnswer: AnswerChoice.B },
      );
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'sub-1',
          questionNumber: 3,
          finalAnswer: AnswerChoice.B,
          source: 'remark.approved',
        }),
      );
    });
  });

  describe('omr queue completed -> batch status -> notification event', () => {
    it('emits omr.batch.completed when final batch status is reached', async () => {
      const omrProcessor = {
        processJob: jest.fn().mockResolvedValue({
          batchId: 'batch-1',
          examId: 'exam-1',
          resolvedVariantId: null,
          imageUrl: 'https://example.com/file.png',
          studentId: null,
          studentCode: null,
          detectedTestId: null,
          resolvedTestCode: null,
          testCodeResolutionStatus: 'MISSING_TEST_CODE',
          status: 'NEEDS_REVIEW',
          score: 0,
          needsReview: true,
          details: [],
        }),
      };

      const omrRepository = {
        markBatchStatus: jest.fn().mockResolvedValue({}),
        recordSuccessfulFile: jest.fn().mockResolvedValue({
          id: 'batch-1',
          status: 'COMPLETED',
          processedFiles: 1,
          totalFiles: 1,
        }),
        recordFailedFile: jest.fn(),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot()],
        providers: [
          OmrQueueProcessor,
          OmrBatchStateUpdaterService,
          BatchService,
          { provide: OmrProcessor, useValue: omrProcessor },
          { provide: OmrRepository, useValue: omrRepository },
          {
            provide: GradingService,
            useValue: { summarizeSubmission: jest.fn() },
          },
          {
            provide: SseRegistryService,
            useValue: { emit: jest.fn(), complete: jest.fn(), stream: jest.fn() },
          },
        ],
      }).compile();

      const processor = moduleRef.get(OmrQueueProcessor);
      const eventEmitter = moduleRef.get(EventEmitter2);
      const notificationSpy = jest.fn();
      eventEmitter.on('omr.batch.completed', notificationSpy);

      await processor.handleProcessFile({
        id: 'job-1',
        name: 'omr.process-file',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          batchId: 'batch-1',
          examId: 'exam-1',
          fileIndex: 1,
          totalFiles: 1,
          file: {
            fieldname: 'files',
            originalname: 'sheet.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: 10,
            bufferBase64: Buffer.from('sheet').toString('base64'),
          },
        },
      } as any);

      expect(omrRepository.recordSuccessfulFile).toHaveBeenCalled();
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'batch-1',
          status: 'COMPLETED',
        }),
      );
    });
  });

  describe('question bank mapping -> exam create/update', () => {
    it('uses created question ids in exam mapping across create and update', async () => {
      const questionsRepository = {
        createQuestion: jest
          .fn()
          .mockResolvedValueOnce(buildQuestionEntity('q-1'))
          .mockResolvedValueOnce(buildQuestionEntity('q-2')),
      };

      const examsRepository = {
        createExam: jest.fn().mockResolvedValue(buildExamEntity()),
        findTeacherClassesByIds: jest
          .fn()
          .mockResolvedValue([{ id: 'class-1' }]),
        findTeacherQuestionsByIds: jest
          .fn()
          .mockImplementation(
            async (_teacherId: string, questionIds: string[]) =>
              questionIds.map((id) => ({ id })),
          ),
        findTeacherExamById: jest.fn().mockResolvedValue(buildExamEntity()),
        countExamDependencies: jest
          .fn()
          .mockResolvedValue({ submissionCount: 0, batchCount: 0 }),
        updateExam: jest.fn().mockResolvedValue(buildExamEntity()),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        providers: [
          QuestionsService,
          ExamsService,
          { provide: QuestionsRepository, useValue: questionsRepository },
          { provide: ExamsRepository, useValue: examsRepository },
        ],
      }).compile();

      const questionsService = moduleRef.get(QuestionsService);
      const examsService = moduleRef.get(ExamsService);

      const q1 = await questionsService.createQuestion('teacher-1', {
        content: 'Question 1',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: AnswerChoice.A,
        subject: 'Math',
        difficulty: 'EASY' as any,
        tags: ['algebra'],
      });

      const q2 = await questionsService.createQuestion('teacher-1', {
        content: 'Question 2',
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctAnswer: AnswerChoice.B,
        subject: 'Math',
        difficulty: 'EASY' as any,
        tags: ['geometry'],
      });

      await examsService.createExam('teacher-1', {
        title: 'Exam 1',
        maxScore: 10,
        classIds: ['class-1'],
        variants: [
          {
            testCode: 'A01',
            answerKeys: [{ questionNumber: 1, correctAnswer: AnswerChoice.A }],
          },
        ],
        questionMap: [{ questionNumber: 1, questionId: q1.id }],
      });

      await examsService.updateExam('exam-1', 'teacher-1', {
        questionMap: [{ questionNumber: 1, questionId: q2.id }],
      });

      expect(examsRepository.findTeacherQuestionsByIds).toHaveBeenNthCalledWith(
        1,
        'teacher-1',
        ['q-1'],
      );
      expect(examsRepository.findTeacherQuestionsByIds).toHaveBeenNthCalledWith(
        2,
        'teacher-1',
        ['q-2'],
      );
      expect(examsRepository.createExam).toHaveBeenCalled();
      expect(examsRepository.updateExam).toHaveBeenCalled();
    });
  });
});

function buildQuestionEntity(id: string) {
  return {
    id,
    teacherId: 'teacher-1',
    content: 'Question',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: AnswerChoice.A,
    subject: 'Math',
    difficulty: 'EASY',
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function buildExamEntity() {
  return {
    id: 'exam-1',
    title: 'Exam',
    maxScore: 10,
    teacherId: 'teacher-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    teacher: {
      id: 'teacher-1',
      name: 'Teacher',
      email: 'teacher@example.com',
    },
    classes: [
      {
        class: {
          id: 'class-1',
          name: '12A1',
          subject: 'Math',
          schoolYear: '2025-2026',
          code: 'EDU-123456',
        },
      },
    ],
    variants: [
      {
        id: 'variant-1',
        testCode: 'A01',
        answerKeys: [{ questionNumber: 1, correctAnswer: AnswerChoice.A }],
      },
    ],
    questionMap: [
      {
        questionNumber: 1,
        questionId: 'q-1',
        question: {
          id: 'q-1',
          content: 'Question',
          subject: 'Math',
          difficulty: 'EASY',
        },
      },
    ],
  };
}
