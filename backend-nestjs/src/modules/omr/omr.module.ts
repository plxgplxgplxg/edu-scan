import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OmrController } from './controllers/omr.controller';
import { OmrSseController } from './controllers/omr-sse.controller';
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
import { SseRegistryService } from './services/sse-registry.service';
import { OMR_TRANSPORT_CLIENT } from './interfaces/omr-transport.interface';
import {
  getOmrGrpcProtoPath,
  OMR_GRPC_CLIENT_TOKEN,
  OMR_GRPC_PACKAGE_NAME,
} from './omr-grpc.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OMR_QUEUE_NAME,
      // Bull's defaults poll Redis every 5 seconds even while this queue is
      // empty. OMR is event-driven: BRPOPLPUSH wakes the worker as soon as a
      // job is added, so a longer blocking wait does not add latency.
      settings: {
        // One blocking read/minute while idle instead of one/5 seconds.
        drainDelay: 60,
        // There are no scheduled OMR jobs. This is only a safety net for a
        // delayed retry if the process restarts before Bull installs its timer.
        guardInterval: 60_000,
        // Recover a job left active by a crashed worker without continuously
        // scanning an otherwise idle queue.
        stalledInterval: 15 * 60_000,
        // OMR work includes uploads and gRPC processing. A longer lock and
        // renewal interval prevent false stalls and reduce lock-renew commands.
        lockDuration: 5 * 60_000,
        lockRenewTime: 60_000,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    ClientsModule.registerAsync([
      {
        name: OMR_GRPC_CLIENT_TOKEN,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: configService.get<string>('omr.grpcUrl', 'localhost:50051'),
            package: OMR_GRPC_PACKAGE_NAME,
            protoPath: getOmrGrpcProtoPath(),
            loader: {
              keepCase: false,
              arrays: true,
              objects: true,
              defaults: false,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [OmrController, OmrSseController],
  providers: [
    OmrRepository,
    OmrQueueProcessor,
    OmrProcessor,
    BatchService,
    GradingService,
    ImageUploadService,
    OmrClientService,
    {
      provide: OMR_TRANSPORT_CLIENT,
      useExisting: OmrClientService,
    },
    OmrBatchStateUpdaterService,
    OmrQueueService,
    SseRegistryService,
    OmrService,
  ],
  exports: [OmrService],
})
export class OmrModule {}
