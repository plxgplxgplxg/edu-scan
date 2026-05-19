import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ExamType } from '@prisma/client';
import { BatchService } from './batch.service';
import { UploadOmrDto } from '../dto/request/upload-omr.dto';
import { ImageUploadService } from './image-upload.service';
import { OmrRepository } from '../repositories/omr.repository';
import { OmrQueueService } from './omr-queue.service';

@Injectable()
export class OmrService {
  private readonly logger = new Logger(OmrService.name);

  constructor(
    private readonly omrRepository: OmrRepository,
    private readonly imageUploadService: ImageUploadService,
    private readonly batchService: BatchService,
    private readonly omrQueueService: OmrQueueService,
  ) {}

  async uploadExamSheets(
    teacherId: string,
    uploadOmrDto: UploadOmrDto,
    files: Express.Multer.File[],
  ) {
    this.imageUploadService.validateFiles(files);

    const exam = await this.omrRepository.findExamById(uploadOmrDto.examId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have access to this exam');
    }

    if (exam.type !== ExamType.OMR) {
      throw new ForbiddenException('OMR upload only accepts OMR exams');
    }

    const batch = await this.batchService.createBatch(
      exam.id,
      teacherId,
      files.length,
    );

    void this.omrQueueService
      .enqueueBatch({
        batchId: batch.id,
        examId: exam.id,
        files,
        templateName: uploadOmrDto.templateName,
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown batch error';
        this.logger.error(`OMR batch ${batch.id} enqueue failed: ${message}`);
      });

    return this.batchService.getTeacherBatchById(batch.id, teacherId);
  }

  async listTeacherBatches(teacherId: string) {
    return this.batchService.listTeacherBatches(teacherId);
  }

  async getBatchById(batchId: string, teacherId: string) {
    return this.batchService.getTeacherBatchById(batchId, teacherId);
  }

  async getSubmissionById(submissionId: string, teacherId: string) {
    return this.batchService.getTeacherSubmissionById(submissionId, teacherId);
  }
}
