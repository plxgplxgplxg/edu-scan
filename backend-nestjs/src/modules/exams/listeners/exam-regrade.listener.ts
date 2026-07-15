import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExamsRepository } from '../repositories/exams.repository';

@Injectable()
export class ExamRegradeListener {
  private readonly logger = new Logger(ExamRegradeListener.name);

  constructor(private readonly examsRepository: ExamsRepository) {}

  @OnEvent('exam.regrade')
  async handleExamRegrade(event: { examId: string }) {
    this.logger.log(`Starting background regrade for exam: ${event.examId}`);
    try {
      await this.examsRepository.regradeSubmissions(event.examId);
      this.logger.log(`Finished background regrade for exam: ${event.examId}`);
    } catch (error) {
      this.logger.error(
        `Failed background regrade for exam: ${event.examId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
