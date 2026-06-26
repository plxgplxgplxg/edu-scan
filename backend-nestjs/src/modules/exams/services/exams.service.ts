import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerChoice,
  ExamStatus,
  ExamType,
  QuestionType,
  Role,
} from '@prisma/client';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
  toExamResponseDto,
} from '../dto/response/exam-response.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsRepository } from '../repositories/exams.repository';
import { CreateClassExamDto } from '../dto/request/create-class-exam.dto';
import { UpsertClassExamQuestionDto } from '../dto/request/upsert-class-exam-question.dto';

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
    return this.createExamByType(teacherId, createExamDto, ExamType.OMR);
  }

  async createClassExam(
    teacherId: string,
    createExamDto: CreateClassExamDto,
  ): Promise<ExamResponseDto> {
    const normalized = this.normalizeExamPayload(
      {
        title: createExamDto.title,
        maxScore: createExamDto.maxScore,
        classIds: createExamDto.classIds,
        variants: [],
        questionMap: [],
      },
      true,
    );

    if (normalized.classIds.length === 0) {
      throw new BadRequestException(
        'Class exam must belong to at least one class',
      );
    }

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);

    const exam = await this.examsRepository.createExam({
      title: normalized.title,
      maxScore: normalized.maxScore,
      teacherId,
      classIds: normalized.classIds,
      variants: [],
      questionMap: [],
      type: ExamType.CLASS_EXAM,
    });

    return toExamResponseDto(exam);
  }

  async createExam(
    teacherId: string,
    createExamDto: CreateExamDto,
  ): Promise<ExamResponseDto> {
    return this.createOmrExam(teacherId, createExamDto);
  }

  async listTeacherOmrExams(teacherId: string): Promise<ExamResponseDto[]> {
    const exams = await this.examsRepository.listTeacherExamsByType(
      teacherId,
      ExamType.OMR,
    );
    return exams.map(toExamResponseDto);
  }

  async listClassExams(userId: string, role: Role): Promise<ExamResponseDto[]> {
    const exams =
      role === Role.TEACHER
        ? await this.examsRepository.listTeacherExamsByType(
            userId,
            ExamType.CLASS_EXAM,
          )
        : await this.examsRepository.listStudentPublishedClassExams(userId);

    return exams.map(toExamResponseDto);
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

    this.assertExamType(existingExam.type, ExamType.OMR, 'update OMR exam');

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

  async upsertExamQuestionAnswer(
    examId: string,
    teacherId: string,
    payload: {
      questionNumber: number;
      correctAnswer: AnswerChoice;
      questionId?: string;
      testCode?: string;
    },
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    this.assertExamType(exam.type, ExamType.OMR, 'update OMR answers');

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published exam');
    }

    if (payload.questionId) {
      await this.ensureTeacherOwnsMappedQuestions(teacherId, [
        {
          questionNumber: payload.questionNumber,
          questionId: payload.questionId,
        },
      ]);
    }

    const updated = await this.examsRepository.upsertExamQuestionAnswer({
      examId,
      testCode: this.normalizeTestCode(
        payload.testCode ?? DRAFT_VARIANT_TEST_CODE,
      ),
      questionNumber: payload.questionNumber,
      questionId: payload.questionId,
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

    this.assertExamType(exam.type, ExamType.OMR, 'remove OMR answers');

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

    this.assertExamType(exam.type, ExamType.OMR, 'publish OMR exam');

    if (exam.variants.length === 0) {
      throw new BadRequestException('Cannot publish exam without answer keys');
    }

    const questionNumbers = exam.questionMap.map((item) => item.questionNumber);
    this.ensureQuestionMapMatchesVariants(
      exam.variants.map((variant) => ({
        testCode: variant.testCode,
        answerKeys: variant.answerKeys.map((item) => ({
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      })),
      questionNumbers,
    );

    const updated = await this.examsRepository.updateExamStatus(
      examId,
      ExamStatus.PUBLISHED,
    );
    return toExamResponseDto(updated);
  }

  async upsertClassExamQuestion(
    examId: string,
    teacherId: string,
    payload: UpsertClassExamQuestionDto,
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    this.assertExamType(exam.type, ExamType.CLASS_EXAM, 'update class exam');

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published exam');
    }

    if (
      payload.type === QuestionType.MULTIPLE_CHOICE &&
      (!payload.optionA ||
        !payload.optionB ||
        !payload.optionC ||
        !payload.optionD)
    ) {
      throw new BadRequestException(
        'Multiple choice question must include options A/B/C/D',
      );
    }

    const updated = await this.examsRepository.upsertClassExamQuestion({
      examId,
      ...payload,
    });

    return toExamResponseDto(updated);
  }

  async removeClassExamQuestion(
    examId: string,
    teacherId: string,
    questionId: string,
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    this.assertExamType(exam.type, ExamType.CLASS_EXAM, 'update class exam');

    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published exam');
    }

    const updated = await this.examsRepository.removeClassExamQuestion(
      examId,
      questionId,
    );
    return toExamResponseDto(updated);
  }

  async publishClassExam(
    examId: string,
    teacherId: string,
  ): Promise<ExamResponseDto> {
    const exam = await this.examsRepository.findTeacherExamById(
      examId,
      teacherId,
    );
    if (!exam) throw new NotFoundException('Exam not found');

    this.assertExamType(exam.type, ExamType.CLASS_EXAM, 'publish class exam');

    if (exam.classes.length === 0) {
      throw new BadRequestException(
        'Class exam must belong to at least one class',
      );
    }

    if (exam.classQuestions.length === 0) {
      throw new BadRequestException(
        'Class exam must contain at least one question',
      );
    }

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

  private async createExamByType(
    teacherId: string,
    createExamDto: CreateExamDto,
    type: ExamType,
  ): Promise<ExamResponseDto> {
    const normalized = this.normalizeExamPayload(createExamDto, true);

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
      type,
    });

    return toExamResponseDto(exam);
  }

  private normalizeExamPayload(
    payload: {
      title: string;
      maxScore: number;
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
      questionMap?: Array<{ questionNumber: number; questionId?: string }>;
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

  private ensureQuestionMapMatchesVariants(
    variants: NormalizedVariant[],
    mappedNumbers: number[],
  ) {
    if (variants.length === 0) {
      return;
    }

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

    if (questionIds.length === 0) return;

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

  private assertExamType(actual: ExamType, expected: ExamType, action: string) {
    if (actual !== expected) {
      throw new BadRequestException(`Cannot ${action} for exam type ${actual}`);
    }
  }
}
