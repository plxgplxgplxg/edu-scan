import { Module } from '@nestjs/common';
import { OmrController } from './controllers/omr.controller';
import { OmrRepository } from './repositories/omr.repository';
import { OmrProcessor } from './processors/omr.processor';
import { BatchService } from './services/batch.service';
import { GradingService } from './services/grading.service';
import { ImageUploadService } from './services/image-upload.service';
import { OmrClientService } from './services/omr-client.service';
import { OmrService } from './services/omr.service';

@Module({
  controllers: [OmrController],
  providers: [
    OmrRepository,
    OmrProcessor,
    BatchService,
    GradingService,
    ImageUploadService,
    OmrClientService,
    OmrService,
  ],
  exports: [OmrService],
})
export class OmrModule {}
