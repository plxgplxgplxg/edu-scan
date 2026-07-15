import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { OmrQueueProcessor } from '../../src/modules/omr/processors/omr-queue.processor';
import { OmrProcessor } from '../../src/modules/omr/processors/omr.processor';
import { OmrBatchStateUpdaterService } from '../../src/modules/omr/services/omr-batch-state-updater.service';
import { BatchService } from '../../src/modules/omr/services/batch.service';
import { OmrRepository } from '../../src/modules/omr/repositories/omr.repository';
import { GradingService } from '../../src/modules/omr/services/grading.service';
import { SseRegistryService } from '../../src/modules/omr/services/sse-registry.service';
import { ExamsService } from '../../src/modules/exams/services/exams.service';
import { ExamsRepository } from '../../src/modules/exams/repositories/exams.repository';
import { AnswerChoice } from '@prisma/client';

describe('Cross-module hardening flows', () => {
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
            useValue: {
              emit: jest.fn(),
              complete: jest.fn(),
              stream: jest.fn(),
            },
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
      } as never);

      expect(omrRepository.recordSuccessfulFile).toHaveBeenCalled();
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'batch-1',
          status: 'COMPLETED',
        }),
      );
    });
  });

  describe('OMR exam answer-key flow', () => {
    it('creates and updates variants without a question bank mapping dependency', async () => {
      const examsRepository = {
        createExam: jest.fn().mockResolvedValue(buildExamEntity()),
        findTeacherClassesByIds: jest
          .fn()
          .mockResolvedValue([{ id: 'class-1' }]),
        findTeacherExamById: jest.fn().mockResolvedValue(buildExamEntity()),
        countExamDependencies: jest
          .fn()
          .mockResolvedValue({ submissionCount: 0, batchCount: 0 }),
        updateExam: jest.fn().mockResolvedValue(buildExamEntity()),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot()],
        providers: [
          ExamsService,
          { provide: ExamsRepository, useValue: examsRepository },
        ],
      }).compile();

      const examsService = moduleRef.get(ExamsService);

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
      });

      await examsService.updateExam('exam-1', 'teacher-1', {
        variants: [
          {
            testCode: 'A01',
            answerKeys: [{ questionNumber: 1, correctAnswer: AnswerChoice.B }],
          },
        ],
      });

      expect(examsRepository.createExam).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: [
            {
              testCode: 'A01',
              answerKeys: [
                { questionNumber: 1, correctAnswer: AnswerChoice.A },
              ],
            },
          ],
        }),
      );
      expect(examsRepository.updateExam).toHaveBeenCalledWith(
        'exam-1',
        expect.objectContaining({
          variants: [
            {
              testCode: 'A01',
              answerKeys: [
                { questionNumber: 1, correctAnswer: AnswerChoice.B },
              ],
            },
          ],
        }),
      );
    });
  });
});

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
  };
}
