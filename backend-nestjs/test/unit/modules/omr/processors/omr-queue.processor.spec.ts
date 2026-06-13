import { Job } from 'bull';
import { OmrQueueProcessor } from '../../../../../src/modules/omr/processors/omr-queue.processor';

describe('OmrQueueProcessor', () => {
  const omrProcessor = {
    processJob: jest.fn(),
  };
  const batchStateUpdater = {
    markProcessing: jest.fn(),
    recordSuccessfulFile: jest.fn(),
    recordFailedFile: jest.fn(),
  };
  const sseRegistryService = {
    emit: jest.fn(),
  };

  let processor: OmrQueueProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new OmrQueueProcessor(
      omrProcessor as never,
      batchStateUpdater as never,
      sseRegistryService as never,
    );
    batchStateUpdater.markProcessing.mockResolvedValue(undefined);
    batchStateUpdater.recordSuccessfulFile.mockResolvedValue(undefined);
    batchStateUpdater.recordFailedFile.mockResolvedValue(undefined);
  });

  it('updates success counter when processing succeeds', async () => {
    const job = buildJob({
      data: {
        batchId: 'batch-1',
        examId: 'exam-1',
        fileIndex: 1,
        totalFiles: 1,
        file: buildSerializedFile(),
      },
    });
    omrProcessor.processJob.mockResolvedValue({
      batchId: 'batch-1',
      examId: 'exam-1',
      resolvedVariantId: null,
      imageUrl: 'https://storage.example.com/file.png',
      studentId: null,
      studentCode: null,
      detectedTestId: null,
      resolvedTestCode: null,
      testCodeResolutionStatus: 'MISSING_TEST_CODE',
      status: 'NEEDS_REVIEW',
      score: 0,
      needsReview: true,
      details: [],
    });
    batchStateUpdater.recordSuccessfulFile.mockResolvedValue({
      totalFiles: 1,
      processedFiles: 1,
    });

    await processor.handleProcessFile(job as never);

    expect(batchStateUpdater.markProcessing).toHaveBeenCalledWith('batch-1');
    expect(omrProcessor.processJob).toHaveBeenCalled();
    expect(batchStateUpdater.recordSuccessfulFile).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-1',
      }),
    );
    expect(sseRegistryService.emit).toHaveBeenCalledWith(
      'omr:batch-1',
      expect.objectContaining({
        type: 'batch:file:done',
        batchId: 'batch-1',
        fileIndex: 1,
        pct: 100,
      }),
    );
    expect(batchStateUpdater.recordFailedFile).not.toHaveBeenCalled();
  });

  it('does not increment failed counter for non-final retry attempts', async () => {
    const job = buildJob({
      attemptsMade: 1,
      opts: {
        attempts: 3,
      },
      data: {
        batchId: 'batch-1',
        examId: 'exam-1',
        fileIndex: 1,
        totalFiles: 1,
        file: buildSerializedFile(),
      },
    });
    omrProcessor.processJob.mockRejectedValue(new Error('OMR timeout'));

    await expect(processor.handleProcessFile(job as never)).rejects.toThrow(
      'OMR timeout',
    );
    expect(batchStateUpdater.recordFailedFile).not.toHaveBeenCalled();
  });

  it('increments failed counter when final retry attempt fails', async () => {
    const job = buildJob({
      attemptsMade: 2,
      opts: {
        attempts: 3,
      },
      data: {
        batchId: 'batch-1',
        examId: 'exam-1',
        fileIndex: 1,
        totalFiles: 1,
        file: buildSerializedFile(),
      },
    });
    omrProcessor.processJob.mockRejectedValue(new Error('Invalid payload'));
    batchStateUpdater.recordFailedFile.mockResolvedValue({
      totalFiles: 1,
      processedFiles: 1,
    });

    await expect(processor.handleProcessFile(job as never)).rejects.toThrow(
      'Invalid payload',
    );
    expect(batchStateUpdater.recordFailedFile).toHaveBeenCalledWith('batch-1');
    expect(sseRegistryService.emit).toHaveBeenCalledWith(
      'omr:batch-1',
      expect.objectContaining({
        type: 'batch:file:failed',
        errorMessage: 'Invalid payload',
        pct: 100,
      }),
    );
  });
});

function buildSerializedFile() {
  return {
    fieldname: 'files',
    originalname: 'sheet.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 10,
    bufferBase64: Buffer.from('sheet').toString('base64'),
  };
}

function buildJob(input: Partial<Job>): Partial<Job> {
  return {
    id: 'job-1',
    name: 'omr.process-file',
    attemptsMade: 0,
    opts: {
      attempts: 3,
    },
    ...input,
  };
}
