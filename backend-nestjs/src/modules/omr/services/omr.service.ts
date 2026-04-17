import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { UploadOmrDto } from '../dto/request/upload-omr.dto';
import { ImageUploadService } from './image-upload.service';
import { OmrRepository } from '../repositories/omr.repository';
import { OmrProcessor } from '../processors/omr.processor';

@Injectable()
export class OmrService {
  private readonly logger = new Logger(OmrService.name);

  constructor(
    private readonly omrRepository: OmrRepository,
    private readonly imageUploadService: ImageUploadService,
    private readonly batchService: BatchService,
    private readonly omrProcessor: OmrProcessor,
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

    const batch = await this.batchService.createBatch(
      exam.id,
      teacherId,
      files.length,
    );

    void this.omrProcessor
      .processBatch({
        batchId: batch.id,
        exam,
        files,
        templateName: uploadOmrDto.templateName,
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown batch error';
        this.logger.error(`OMR batch ${batch.id} failed: ${message}`);
      });

    return this.batchService.getTeacherBatchById(batch.id, teacherId);
  }

  async getBatchById(batchId: string, teacherId: string) {
    return this.batchService.getTeacherBatchById(batchId, teacherId);
  }

  async getSubmissionById(submissionId: string, teacherId: string) {
    return this.batchService.getTeacherSubmissionById(submissionId, teacherId);
  }
}
