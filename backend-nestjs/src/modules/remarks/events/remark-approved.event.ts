import { AnswerChoice } from '@prisma/client';

export class RemarkApprovedEvent {
  constructor(
    public readonly submissionDetailId: string,
    public readonly finalAnswer: AnswerChoice,
  ) {}
}
