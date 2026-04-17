import { SubmissionStatus } from '@prisma/client';
import { OmrProcessor } from '../../../../../src/modules/omr/processors/omr.processor';

describe('OmrProcessor', () => {
  const batchService = {
    markProcessing: jest.fn(),
    recordSuccessfulFile: jest.fn(),
    recordFailedFile: jest.fn(),
  };
  const imageUploadService = {
    uploadFile: jest.fn(),
    uploadArtifact: jest.fn(),
  };
  const omrClientService = {
    processImage: jest.fn(),
  };
  const gradingService = {
    prepareSubmission: jest.fn(),
  };
  const omrRepository = {
    findEligibleStudentForExam: jest.fn(),
  };

  let processor: OmrProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new OmrProcessor(
      batchService as never,
      imageUploadService as never,
      omrClientService as never,
      gradingService as never,
      omrRepository as never,
    );
    batchService.markProcessing.mockResolvedValue(undefined);
    imageUploadService.uploadFile.mockResolvedValue(
      'https://storage.example.com/original.png',
    );
    imageUploadService.uploadArtifact
      .mockResolvedValueOnce('https://storage.example.com/processed.png')
      .mockResolvedValueOnce('https://storage.example.com/annotated.png')
      .mockResolvedValueOnce('https://storage.example.com/warp.png')
      .mockResolvedValueOnce('https://storage.example.com/scores.json');
    omrClientService.processImage.mockResolvedValue({
      studentCode: 'STU-001',
      needsReview: false,
      answers: [{ questionNumber: 1, detectedAnswer: 'A', needsReview: false }],
      artifacts: {
        processedImagePath: '/tmp/processed.png',
        annotatedImagePath: '/tmp/annotated.png',
        warpOverlayPath: '/tmp/warp.png',
        answerScoresPath: '/tmp/scores.json',
      },
    });
    gradingService.prepareSubmission.mockReturnValue({
      studentCode: 'STU-001',
      status: SubmissionStatus.GRADED,
      details: [
        {
          questionNumber: 1,
          detectedAnswer: 'A',
          finalAnswer: 'A',
          needsReview: false,
          reviewReason: null,
        },
      ],
    });
    omrRepository.findEligibleStudentForExam.mockResolvedValue({
      id: 'student-1',
    });
    batchService.recordSuccessfulFile.mockResolvedValue(undefined);
  });

  it('uploads returned artifacts and persists their urls', async () => {
    await processor.processBatch({
      batchId: 'batch-1',
      templateName: 'tnteam_60q_4col_ad',
      exam: {
        id: 'exam-1',
        answerKeys: [{ questionNumber: 1, correctAnswer: 'A' }],
      } as never,
      files: [
        {
          originalname: 'sheet.png',
          mimetype: 'image/png',
          buffer: Buffer.from('sheet'),
        } as Express.Multer.File,
      ],
    });

    expect(omrClientService.processImage).toHaveBeenCalledWith({
      imageUrl: 'https://storage.example.com/original.png',
      templateName: 'tnteam_60q_4col_ad',
      answerKey: [{ questionNumber: 1, correctAnswer: 'A' }],
    });
    expect(imageUploadService.uploadArtifact).toHaveBeenCalledTimes(4);
    expect(batchService.recordSuccessfulFile).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-1',
        processedImageUrl: 'https://storage.example.com/processed.png',
        annotatedImageUrl: 'https://storage.example.com/annotated.png',
        warpOverlayUrl: 'https://storage.example.com/warp.png',
        answerScoresUrl: 'https://storage.example.com/scores.json',
      }),
    );
  });
});
