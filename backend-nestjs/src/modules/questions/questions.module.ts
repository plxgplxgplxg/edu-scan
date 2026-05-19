import { Module } from '@nestjs/common';
import { QuestionsController } from './controllers/questions.controller';
import { QuestionsRepository } from './repositories/questions.repository';
import { QuestionsService } from './services/questions.service';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsRepository, QuestionsService],
  exports: [QuestionsRepository, QuestionsService],
})
export class QuestionsModule {}
