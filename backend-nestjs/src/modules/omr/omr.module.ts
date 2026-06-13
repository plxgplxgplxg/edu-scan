import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
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
  controllers: [OmrController],
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
    OmrService,
  ],
  exports: [OmrService],
})
export class OmrModule {}
