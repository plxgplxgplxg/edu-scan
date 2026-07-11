import { Module } from '@nestjs/common';
import { ExamsController } from './controllers/exams.controller';
import { ExamsRepository } from './repositories/exams.repository';
import { ExamsService } from './services/exams.service';

import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [SubmissionsModule],
  controllers: [ExamsController],
  providers: [ExamsRepository, ExamsService],
  exports: [ExamsRepository, ExamsService],
})
export class ExamsModule {}
