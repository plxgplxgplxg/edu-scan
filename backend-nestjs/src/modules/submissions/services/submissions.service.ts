import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubmissionsRepository } from '../repositories/submissions.repository';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import {
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
  AnswerChoice,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { RemarkApprovedEvent } from '../../remarks/events/remark-approved.event';
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly submissionsRepository: SubmissionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: GetSubmissionsQueryDto) {
    const filter = { ...query };
    return this.submissionsRepository.findAll(filter);
  }

  async findOneWithScore(
    id: string,
    requestUser: { id: string; role: string },
  ) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (
      requestUser.role === Role.STUDENT &&
      submission.studentId !== requestUser.id
    ) {
      throw new ForbiddenException('You can only access your own submissions');
    }

    let calculatedScore = 0;
    const maxScore = submission.exam.maxScore;
    const totalQuestions = submission.details.length;
    let correctCount = 0;

    const answerKeysMap = new Map<number, AnswerChoice>();
    if (submission.resolvedVariant?.answerKeys) {
      for (const key of submission.resolvedVariant.answerKeys) {
        answerKeysMap.set(key.questionNumber, key.correctAnswer);
      }
    }

    const processedDetails = submission.details.map((detail) => {
      const correctAnswer = answerKeysMap.get(detail.questionNumber);
      const isCorrect = correctAnswer && detail.finalAnswer === correctAnswer;
      if (isCorrect) correctCount++;
      return {
        ...detail,
        isCorrect,
        correctAnswer,
      };
    });

    if (totalQuestions > 0 && answerKeysMap.size > 0) {
      calculatedScore = (correctCount / answerKeysMap.size) * maxScore;
    }

    return {
      ...submission,
      details: processedDetails,
      score: {
        totalCorrect: correctCount,
        maxScore,
        calculatedScore,
      },
    };
  }

  async manualOverride(id: string, dto: UpdateSubmissionOverrideDto) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const updateData: any = {};
    if (dto.studentCode) {
      updateData.studentCode = dto.studentCode;
      const student = await this.prisma.user.findUnique({
        where: { studentCode: dto.studentCode },
      });
      if (student) {
        updateData.studentId = student.id;
      }
    }

    if (dto.resolvedTestCode)
      updateData.resolvedTestCode = dto.resolvedTestCode;
    if (dto.resolvedVariantId)
      updateData.resolvedVariantId = dto.resolvedVariantId;

    if (dto.resolvedTestCode || dto.resolvedVariantId) {
      updateData.testCodeResolutionStatus = TestCodeResolutionStatus.MATCHED;
    }

    updateData.status = SubmissionStatus.GRADED;
    updateData.reviewedAt = new Date();

    const updatedSubmission = await this.submissionsRepository.update(
      id,
      updateData,
    );

    if (dto.details && dto.details.length > 0) {
      for (const detail of dto.details) {
        await this.submissionsRepository.updateSubmissionDetail(
          id,
          detail.questionNumber,
          {
            finalAnswer: detail.finalAnswer,
          },
        );
      }
    }

    // Optionally refetch or return the updated data directly
    return this.submissionsRepository.findOneWithDetails(id);
  }

  @OnEvent('remark.approved')
  async handleRemarkApprovedEvent(payload: RemarkApprovedEvent) {
    const detail = await this.prisma.submissionDetail.findUnique({
      where: { id: payload.submissionDetailId },
    });
    
    if (detail) {
      await this.submissionsRepository.updateSubmissionDetail(
        detail.submissionId,
        detail.questionNumber,
        { finalAnswer: payload.finalAnswer }
      );
      // Wait, updateSubmissionDetail takes (id, questionNumber, data) 
      // where id is submissionId.
      // After updating, since the score is dynamically calculated in findOneWithScore currently (it seems the system calculates on the fly based on answer keys), we don't need to save score to the Submission table. Wait, grade is in Submission if there's a score field... Wait, the schema "Submission" doesn't have a score field.
      // Let's check the schema for Submission. Schema: Submission has no score field. Score calculation is dynamic.
      // So updating the detail is enough!
    }
  }
}
