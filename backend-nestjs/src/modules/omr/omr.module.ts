import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { OmrController } from './controllers/omr.controller';
import { OmrQueueProcessor } from './processors/omr-queue.processor';
import { OmrRepository } from './repositories/omr.repository';
import { OmrProcessor } from './processors/omr.processor';
import { OMR_QUEUE_NAME } from './queue/omr-queue.constants';
import { BatchService } from './services/batch.service';
import { GradingService } from './services/grading.service';
import { ImageUploadService } from './services/image-upload.service';
import { OmrBatchStateUpdaterService } from './services/omr-batch-state-updater.service';
import { OmrClientService } from './services/omr-client.service';
import { OmrQueueService } from './services/omr-queue.service';
import { OmrService } from './services/omr.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OMR_QUEUE_NAME,
    }),
  ],
  controllers: [OmrController],
  providers: [
    OmrRepository,
    OmrQueueProcessor,
    OmrProcessor,
    BatchService,
    GradingService,
    ImageUploadService,
    OmrClientService,
    OmrBatchStateUpdaterService,
    OmrQueueService,
    OmrService,
  ],
  exports: [OmrService],
})
export class OmrModule {}
