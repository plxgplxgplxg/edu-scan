import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';
import { OmrProcessor } from '../../../../../src/modules/omr/processors/omr.processor';

describe('OmrProcessor', () => {
  const imageUploadService = {
    uploadFile: jest.fn(),
    uploadArtifact: jest.fn(),
  };
  const omrClientService = {
    detectImage: jest.fn(),
    renderGradeOverlay: jest.fn(),
  };
  const gradingService = {
    resolveVariant: jest.fn(),
    prepareSubmission: jest.fn(),
    summarizeSubmission: jest.fn(),
  };
  const omrRepository = {
    findExamById: jest.fn(),
    findStudentByStudentCode: jest.fn(),
  };

  let processor: OmrProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new OmrProcessor(
      imageUploadService as never,
      omrClientService as never,
      gradingService as never,
      omrRepository as never,
    );
    imageUploadService.uploadFile.mockResolvedValue(
      'https://storage.example.com/original.png',
    );
    imageUploadService.uploadArtifact
      .mockResolvedValueOnce('https://storage.example.com/processed.png')
      .mockResolvedValueOnce('https://storage.example.com/annotated.png')
      .mockResolvedValueOnce('https://storage.example.com/warp.png')
      .mockResolvedValueOnce('https://storage.example.com/scores.json');
    omrClientService.detectImage.mockResolvedValue({
      testId: '001',
      studentCode: 'STU-001',
      needsReview: false,
      answers: [{ questionNumber: 1, detectedAnswer: 'A', needsReview: false }],
      artifacts: {
        resultJsonPath: '/tmp/result.json',
        processedImagePath: '/tmp/processed.png',
        warpOverlayPath: '/tmp/warp.png',
        answerScoresPath: '/tmp/scores.json',
      },
    });
    omrClientService.renderGradeOverlay.mockResolvedValue({
      artifacts: {
        annotatedImagePath: '/tmp/annotated.png',
      },
    });
    gradingService.resolveVariant.mockReturnValue({
      status: TestCodeResolutionStatus.MATCHED,
      resolvedVariantId: 'variant-1',
      detectedTestId: '001',
      resolvedTestCode: '001',
    });
    gradingService.summarizeSubmission.mockReturnValue({
      score: 7.5,
      maxScore: 10,
      correctCount: 1,
      wrongCount: 1,
      reviewCount: 0,
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
    omrRepository.findStudentByStudentCode.mockResolvedValue({
      id: 'student-1',
    });
    omrRepository.findExamById.mockResolvedValue({
      id: 'exam-1',
      variants: [
        {
          id: 'variant-1',
          answerKeys: [{ questionNumber: 1, correctAnswer: 'A' }],
        },
      ],
    });
  });

  it('uploads returned artifacts and persists their urls', async () => {
    const payload = await processor.processJob({
      batchId: 'batch-1',
      examId: 'exam-1',
      fileIndex: 0,
      totalFiles: 1,
      templateName: 'tnteam_60q_4col_ad',
      file: {
        fieldname: 'files',
        originalname: 'sheet.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 5,
        bufferBase64: Buffer.from('sheet').toString('base64'),
      },
    });

    expect(omrClientService.detectImage).toHaveBeenCalledWith({
      imageUrl: 'https://storage.example.com/original.png',
      templateName: 'tnteam_60q_4col_ad',
    });
    expect(imageUploadService.uploadArtifact).toHaveBeenCalledTimes(4);
    expect(payload).toEqual(
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
