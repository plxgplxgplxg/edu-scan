import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnswerChoice, ExamStatus } from '@prisma/client';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
  toExamListResponseDto,
  toExamResponseDto,
} from '../dto/response/exam-response.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsRepository } from '../repositories/exams.repository';

const DEFAULT_VARIANT_TEST_CODE = 'DEFAULT';
const DRAFT_VARIANT_TEST_CODE = 'DEFAULT';

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

  async createOmrExam(
    teacherId: string,
    createExamDto: CreateExamDto,
  ): Promise<ExamResponseDto> {
    return this.createExam(teacherId, createExamDto);
  }

  async createExam(
    teacherId: string,
    createExamDto: CreateExamDto,
  ): Promise<ExamResponseDto> {
    const normalized = this.normalizeExamPayload(createExamDto, true);

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);

    const exam = await this.examsRepository.createExam({
      title: normalized.title,
      maxScore: normalized.maxScore,
      questionCount: normalized.questionCount,
      teacherId,
      classIds: normalized.classIds,
      variants: normalized.variants,
    });

    return toExamResponseDto(exam);
  }

  async listTeacherOmrExams(teacherId: string): Promise<ExamResponseDto[]> {
    const exams = await this.examsRepository.listTeacherExams(teacherId);
    return exams.map(toExamListResponseDto);
  }

  async listTeacherExams(teacherId: string): Promise<ExamResponseDto[]> {
    const exams = await this.examsRepository.listTeacherExams(teacherId);
    return exams.map(toExamListResponseDto);
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
      questionCount: updateExamDto.questionCount ?? existingExam.questionCount,
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
    });

    const dependencies =
      await this.examsRepository.countExamDependencies(examId);
    const hasDependentData =
      dependencies.submissionCount > 0 || dependencies.batchCount > 0;

    if (
      hasDependentData &&
      (updateExamDto.answerKeys !== undefined ||
        updateExamDto.variants !== undefined ||
        updateExamDto.classIds !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot change classes, variants, or answer keys after submissions or OMR batches already exist',
      );
    }

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);

    const exam = await this.examsRepository.updateExam(examId, {
      title: normalized.title,
      maxScore: normalized.maxScore,
      questionCount: normalized.questionCount,
      classIds: normalized.classIds,
      variants: normalized.variants,
    });

    return toExamResponseDto(exam);
  }

  async upsertExamQuestionAnswer(
    examId: string,
    teacherId: string,
    payload: {
      questionNumber: number;
      correctAnswer: AnswerChoice;
      testCode?: string;
    },
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published exam');
    }

    const updated = await this.examsRepository.upsertExamQuestionAnswer({
      examId,
      testCode: this.normalizeTestCode(
        payload.testCode ?? DRAFT_VARIANT_TEST_CODE,
      ),
      questionNumber: payload.questionNumber,
      correctAnswer: payload.correctAnswer,
    });

    return toExamResponseDto(updated);
  }

  async removeExamQuestionAnswer(
    examId: string,
    teacherId: string,
    payload: { questionNumber: number; testCode?: string },
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published exam');
    }

    const updated = await this.examsRepository.removeExamQuestionAnswer({
      examId,
      testCode: this.normalizeTestCode(
        payload.testCode ?? DRAFT_VARIANT_TEST_CODE,
      ),
      questionNumber: payload.questionNumber,
    });

    return toExamResponseDto(updated);
  }

  async publishExam(
    examId: string,
    teacherId: string,
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    if (exam.variants.length === 0) {
      throw new BadRequestException('Cannot publish exam without answer keys');
    }

    this.ensureVariantsHaveCompleteAnswerKeys(
      exam.variants.map((variant) => ({
        testCode: variant.testCode,
        answerKeys: variant.answerKeys.map((item) => ({
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      })),
    );

    const updated = await this.examsRepository.updateExamStatus(
      examId,
      ExamStatus.PUBLISHED,
    );
    return toExamResponseDto(updated);
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

  private normalizeExamPayload(
    payload: {
      title: string;
      maxScore: number;
      questionCount?: number;
      classIds?: string[];
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
    },
    allowDraftWithoutVariants = false,
  ) {
    const classIds = [
      ...new Set((payload.classIds ?? []).map((item) => item.trim())),
    ];

    const variants = this.normalizeVariants(
      payload.variants,
      payload.answerKeys,
      allowDraftWithoutVariants,
    );

    return {
      title: this.normalizeTitle(payload.title),
      maxScore: payload.maxScore,
      questionCount: payload.questionCount,
      classIds,
      variants,
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
      | Array<{ questionNumber: number; correctAnswer: AnswerChoice }>
      | undefined,
    allowEmpty = false,
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

    if (rawVariants.length === 0 && !allowEmpty) {
      throw new BadRequestException('At least one exam variant is required');
    }

    if (rawVariants.length === 0) {
      return [];
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

  private ensureVariantsHaveCompleteAnswerKeys(variants: NormalizedVariant[]) {
    if (variants.length === 0) {
      return;
    }

    const questionCount = variants[0]?.answerKeys.length ?? 0;
    for (const variant of variants) {
      if (variant.answerKeys.length !== questionCount) {
        throw new BadRequestException(
          'All variants must contain the same number of answer keys',
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
