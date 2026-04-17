import { Module } from '@nestjs/common';
import { AssignmentsController } from './controllers/assignments.controller';
import { AssignmentsService } from './services/assignments.service';
import { AssignmentsRepository } from './repositories/assignments.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository],
  exports: [AssignmentsService, AssignmentsRepository],
})
export class AssignmentsModule {}
