import { Module } from '@nestjs/common';
import { SubmissionsController } from './controllers/submissions.controller';
import { SubmissionsService } from './services/submissions.service';
import { SubmissionsRepository } from './repositories/submissions.repository';
// Assuming DatabaseModule is available to provide PrismaService
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsRepository],
  exports: [SubmissionsService, SubmissionsRepository],
})
export class SubmissionsModule {}
