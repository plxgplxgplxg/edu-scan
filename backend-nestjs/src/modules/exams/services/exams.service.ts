import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnswerChoice } from '@prisma/client';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
  toExamResponseDto,
} from '../dto/response/exam-response.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsRepository } from '../repositories/exams.repository';

const DEFAULT_VARIANT_TEST_CODE = 'DEFAULT';

type NormalizedVariant = {
  testCode: string;
  answerKeys: Array<{
    questionNumber: number;
    correctAnswer: AnswerChoice;
  }>;
};

@Injectable()
export class ExamsService {
  constructor(private readonly examsRepository: ExamsRepository) {}

  async createExam(
    teacherId: string,
    createExamDto: CreateExamDto,
  ): Promise<ExamResponseDto> {
    const normalized = this.normalizeExamPayload(createExamDto);

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);
    await this.ensureTeacherOwnsMappedQuestions(
      teacherId,
      normalized.questionMap,
    );
    this.ensureQuestionMapMatchesVariants(
      normalized.variants,
      normalized.questionMap.map((item) => item.questionNumber),
    );

    const exam = await this.examsRepository.createExam({
      title: normalized.title,
      maxScore: normalized.maxScore,
      teacherId,
      classIds: normalized.classIds,
      variants: normalized.variants,
      questionMap: normalized.questionMap,
    });

    return toExamResponseDto(exam);
  }

  async listTeacherExams(teacherId: string): Promise<ExamResponseDto[]> {
    const exams = await this.examsRepository.listTeacherExams(teacherId);

    return exams.map(toExamResponseDto);
  }

  async getTeacherExamById(
    examId: string,
    teacherId: string,
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return toExamResponseDto(exam);
  }

  async updateExam(
    examId: string,
    teacherId: string,
    updateExamDto: UpdateExamDto,
  ): Promise<ExamResponseDto> {
    const existingExam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );

    if (!existingExam) {
      throw new NotFoundException('Exam not found');
    }

    const normalized = this.normalizeExamPayload({
      title: updateExamDto.title ?? existingExam.title,
      maxScore: updateExamDto.maxScore ?? existingExam.maxScore,
      classIds:
        updateExamDto.classIds ??
        existingExam.classes.map((item) => item.class.id),
      answerKeys: updateExamDto.answerKeys,
      variants:
        updateExamDto.variants ??
        existingExam.variants.map((variant) => ({
          testCode: variant.testCode,
          answerKeys: variant.answerKeys.map((item) => ({
            questionNumber: item.questionNumber,
            correctAnswer: item.correctAnswer,
          })),
        })),
      questionMap:
        updateExamDto.questionMap ??
        existingExam.questionMap.map((item) => ({
          questionNumber: item.questionNumber,
          questionId: item.questionId ?? undefined,
        })),
    });

    const dependencies =
      await this.examsRepository.countExamDependencies(examId);
    const hasDependentData =
      dependencies.submissionCount > 0 || dependencies.batchCount > 0;

    if (
      hasDependentData &&
      (updateExamDto.answerKeys !== undefined ||
        updateExamDto.variants !== undefined ||
        updateExamDto.classIds !== undefined ||
        updateExamDto.questionMap !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot change classes, variants, answer keys, or question mapping after submissions or OMR batches already exist',
      );
    }

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);
    await this.ensureTeacherOwnsMappedQuestions(
      teacherId,
      normalized.questionMap,
    );
    this.ensureQuestionMapMatchesVariants(
      normalized.variants,
      normalized.questionMap.map((item) => item.questionNumber),
    );

    const exam = await this.examsRepository.updateExam(examId, {
      title: normalized.title,
      maxScore: normalized.maxScore,
      classIds: normalized.classIds,
      variants: normalized.variants,
      questionMap: normalized.questionMap,
    });

    return toExamResponseDto(exam);
  }

  async deleteExam(
    examId: string,
    teacherId: string,
  ): Promise<DeleteExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const dependencies =
      await this.examsRepository.countExamDependencies(examId);

    if (dependencies.submissionCount > 0 || dependencies.batchCount > 0) {
      throw new BadRequestException(
        'Cannot delete exam that already has submissions or OMR batches',
      );
    }

    await this.examsRepository.deleteExam(examId);

    return {
      id: examId,
      deleted: true,
    };
  }

  private normalizeExamPayload(payload: {
    title: string;
    maxScore: number;
    classIds: string[];
    answerKeys?: Array<{
      questionNumber: number;
      correctAnswer: AnswerChoice;
    }>;
    variants?: Array<{
      testCode: string;
      answerKeys: Array<{
        questionNumber: number;
        correctAnswer: AnswerChoice;
      }>;
    }>;
    questionMap?: Array<{
      questionNumber: number;
      questionId?: string;
    }>;
  }) {
    const classIds = [...new Set(payload.classIds.map((item) => item.trim()))];

    if (classIds.length === 0) {
      throw new BadRequestException(
        'At least one class must be assigned to the exam',
      );
    }

    const variants = this.normalizeVariants(
      payload.variants,
      payload.answerKeys,
    );
    const questionMap = [...(payload.questionMap ?? [])]
      .map((item) => ({
        questionNumber: item.questionNumber,
        questionId: item.questionId?.trim(),
      }))
      .sort((left, right) => left.questionNumber - right.questionNumber);

    this.ensureUniqueQuestionNumbers(
      questionMap.map((item) => item.questionNumber),
      'Question map numbers must be unique',
    );

    const mappedQuestionIds = questionMap
      .map((item) => item.questionId)
      .filter((item): item is string => !!item);

    if (mappedQuestionIds.length !== new Set(mappedQuestionIds).size) {
      throw new BadRequestException(
        'A question can only be mapped once in the same exam',
      );
    }

    return {
      title: this.normalizeTitle(payload.title),
      maxScore: payload.maxScore,
      classIds,
      variants,
      questionMap,
    };
  }

  private normalizeVariants(
    variants:
      | Array<{
          testCode: string;
          answerKeys: Array<{
            questionNumber: number;
            correctAnswer: AnswerChoice;
          }>;
        }>
      | undefined,
    legacyAnswerKeys:
      | Array<{
          questionNumber: number;
          correctAnswer: AnswerChoice;
        }>
      | undefined,
  ): NormalizedVariant[] {
    if ((variants?.length ?? 0) > 0 && (legacyAnswerKeys?.length ?? 0) > 0) {
      throw new BadRequestException(
        'Provide either variants or legacy answerKeys, not both',
      );
    }

    const rawVariants =
      variants && variants.length > 0
        ? variants
        : legacyAnswerKeys && legacyAnswerKeys.length > 0
          ? [
              {
                testCode: DEFAULT_VARIANT_TEST_CODE,
                answerKeys: legacyAnswerKeys,
              },
            ]
          : [];

    if (rawVariants.length === 0) {
      throw new BadRequestException('At least one exam variant is required');
    }

    const normalizedVariants = rawVariants
      .map((variant) => ({
        testCode: this.normalizeTestCode(variant.testCode),
        answerKeys: [...variant.answerKeys]
          .map((item) => ({
            questionNumber: item.questionNumber,
            correctAnswer: item.correctAnswer,
          }))
          .sort((left, right) => left.questionNumber - right.questionNumber),
      }))
      .sort((left, right) => left.testCode.localeCompare(right.testCode));

    const seenTestCodes = new Set<string>();
    const questionSignature = normalizedVariants[0].answerKeys
      .map((item) => item.questionNumber)
      .join(',');

    for (const variant of normalizedVariants) {
      if (seenTestCodes.has(variant.testCode)) {
        throw new BadRequestException('Variant test codes must be unique');
      }
      seenTestCodes.add(variant.testCode);

      this.ensureUniqueQuestionNumbers(
        variant.answerKeys.map((item) => item.questionNumber),
        `Answer key question numbers must be unique for variant ${variant.testCode}`,
      );

      if (variant.answerKeys.length === 0) {
        throw new BadRequestException(
          `Variant ${variant.testCode} must contain at least one answer key`,
        );
      }

      const currentSignature = variant.answerKeys
        .map((item) => item.questionNumber)
        .join(',');

      if (currentSignature !== questionSignature) {
        throw new BadRequestException(
          'All variants must define the same question number set',
        );
      }
    }

    return normalizedVariants;
  }

  private ensureUniqueQuestionNumbers(numbers: number[], message: string) {
    if (numbers.length !== new Set(numbers).size) {
      throw new BadRequestException(message);
    }
  }

  private ensureQuestionMapMatchesVariants(
    variants: NormalizedVariant[],
    mappedNumbers: number[],
  ) {
    const allowedNumbers = new Set(
      variants[0]?.answerKeys.map((item) => item.questionNumber) ?? [],
    );

    for (const questionNumber of mappedNumbers) {
      if (!allowedNumbers.has(questionNumber)) {
        throw new BadRequestException(
          `Question map contains questionNumber ${questionNumber} that does not exist in variant answer keys`,
        );
      }
    }
  }

  private async ensureTeacherOwnsClasses(
    teacherId: string,
    classIds: string[],
  ) {
    const classes = await this.examsRepository.findTeacherClassesByIds(
      teacherId,
      classIds,
    );

    if (classes.length !== classIds.length) {
      throw new BadRequestException(
        'One or more classes do not exist or do not belong to this teacher',
      );
    }
  }

  private async ensureTeacherOwnsMappedQuestions(
    teacherId: string,
    questionMap: Array<{ questionNumber: number; questionId?: string }>,
  ) {
    const questionIds = questionMap
      .map((item) => item.questionId)
      .filter((item): item is string => !!item);

    if (questionIds.length === 0) {
      return;
    }

    const questions = await this.examsRepository.findTeacherQuestionsByIds(
      teacherId,
      questionIds,
    );

    if (questions.length !== questionIds.length) {
      throw new BadRequestException(
        'One or more mapped questions do not exist or do not belong to this teacher',
      );
    }
  }

  private normalizeTitle(title: string) {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw new BadRequestException('Exam title must not be empty');
    }

    return normalizedTitle;
  }

  private normalizeTestCode(testCode: string) {
    const normalized = testCode.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Variant testCode must not be empty');
    }

    return normalized;
  }
}
