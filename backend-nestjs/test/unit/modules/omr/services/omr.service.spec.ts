import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnswerChoice } from '@prisma/client';
import { OmrService } from '../../../../../src/modules/omr/services/omr.service';
import { UploadOmrDto } from '../../../../../src/modules/omr/dto/request/upload-omr.dto';

const TEST_TEACHER_ID = 'teacher-1';

describe('OmrService', () => {
  let service: OmrService;

  const omrRepository = {
    findExamById: jest.fn(),
  };

  const imageUploadService = {
    validateFiles: jest.fn(),
  };

  const batchService = {
    createBatch: jest.fn(),
    getTeacherBatchById: jest.fn(),
    getTeacherSubmissionById: jest.fn(),
  };

  const omrProcessor = {
    processBatch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OmrService(
      omrRepository as never,
      imageUploadService as never,
      batchService as never,
      omrProcessor as never,
    );
    omrProcessor.processBatch.mockResolvedValue(undefined);
  });

  it('throws not found when exam does not exist', async () => {
    imageUploadService.validateFiles.mockReturnValue(undefined);
    omrRepository.findExamById.mockResolvedValue(null);

    await expect(
      service.uploadExamSheets(TEST_TEACHER_ID, buildUploadDto(), [
        buildFile(),
      ]),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws forbidden when exam does not belong to current teacher', async () => {
    imageUploadService.validateFiles.mockReturnValue(undefined);
    omrRepository.findExamById.mockResolvedValue({
      ...buildExam(),
      teacherId: 'teacher-2',
    });

    await expect(
      service.uploadExamSheets(TEST_TEACHER_ID, buildUploadDto(), [
        buildFile(),
      ]),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates batch and starts processor for valid upload', async () => {
    const exam = buildExam();
    imageUploadService.validateFiles.mockReturnValue(undefined);
    omrRepository.findExamById.mockResolvedValue(exam);
    batchService.createBatch.mockResolvedValue({ id: 'batch-1' });
    batchService.getTeacherBatchById.mockResolvedValue({ id: 'batch-1' });

    const result = await service.uploadExamSheets(
      TEST_TEACHER_ID,
      buildUploadDto(),
      [buildFile()],
    );

    expect(batchService.createBatch).toHaveBeenCalledWith(
      exam.id,
      TEST_TEACHER_ID,
      1,
    );
    expect(omrProcessor.processBatch).toHaveBeenCalledWith({
      batchId: 'batch-1',
      exam,
      files: [buildFile()],
    });
    expect(result).toEqual({ id: 'batch-1' });
  });

  it('delegates batch lookup to batch service', async () => {
    batchService.getTeacherBatchById.mockResolvedValue({ id: 'batch-1' });

    await expect(
      service.getBatchById('batch-1', TEST_TEACHER_ID),
    ).resolves.toEqual({
      id: 'batch-1',
    });
  });

  it('delegates submission lookup to batch service', async () => {
    batchService.getTeacherSubmissionById.mockResolvedValue({
      id: 'submission-1',
    });

    await expect(
      service.getSubmissionById('submission-1', TEST_TEACHER_ID),
    ).resolves.toEqual({
      id: 'submission-1',
    });
  });
});

function buildUploadDto(): UploadOmrDto {
  return {
    examId: 'e2f1bb4e-7330-4b64-9d43-21cb5bb89a18',
  };
}

function buildFile(): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'sheet-1.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 10,
    buffer: Buffer.from('file'),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function buildExam() {
  return {
    id: 'exam-1',
    teacherId: TEST_TEACHER_ID,
    answerKeys: [
      { questionNumber: 1, correctAnswer: AnswerChoice.A },
      { questionNumber: 2, correctAnswer: AnswerChoice.B },
    ],
    classes: [],
  };
}
