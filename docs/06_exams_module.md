# Hướng dẫn: 2.2 UC004 - Exams Module

> Nhiệm vụ: Xây dựng module quản lý đề thi cho giáo viên, hỗ trợ tạo đề, gán nhiều lớp, lưu `AnswerKey`, map câu hỏi từ ngân hàng câu hỏi và cập nhật/xóa đề an toàn.

**Bạn vui lòng tạo các file sau đúng theo cấu trúc và copy nguyên code vào.**

---

## Kết luận nhanh

Sau `Auth`, `Users`, `Classes`, module tiếp theo nên làm là `Exams` vì:

- `OMR Module` phụ thuộc trực tiếp vào `Exam`, `AnswerKey`, `ExamClass`
- `Submission` chấm điểm dựa trên `AnswerKey`
- `Question Bank` có thể tích hợp dần thông qua `ExamQuestion`

Module này **nên có `repository` riêng** vì logic truy vấn đã vượt mức CRUD đơn giản:

- cần transaction khi tạo/cập nhật đề
- cần validate ownership của `Class` và `Question`
- cần load chi tiết đề kèm `classes`, `answerKeys`, `questionMap`
- cần kiểm soát xóa đề để tránh cascade phá dữ liệu đã chấm

Thiết kế bên dưới bám đúng schema hiện tại trong `prisma/schema.prisma`, giữ nguyên nguyên tắc:

- `controller -> service -> repository -> PrismaService`
- high cohesion trong từng lớp
- low coupling giữa module `exams` và module khác
- không tạo `entity` class riêng kiểu TypeORM

---

## File sẽ có trong codebase thật

- `backend-nestjs/src/modules/exams/dto/create-answer-key.dto.ts`
- `backend-nestjs/src/modules/exams/dto/map-exam-question.dto.ts`
- `backend-nestjs/src/modules/exams/dto/create-exam.dto.ts`
- `backend-nestjs/src/modules/exams/dto/update-exam.dto.ts`
- `backend-nestjs/src/modules/exams/repositories/exams.repository.ts`
- `backend-nestjs/src/modules/exams/services/exams.service.ts`
- `backend-nestjs/src/modules/exams/controllers/exams.controller.ts`
- `backend-nestjs/src/modules/exams/exams.module.ts`

> Ở module này tôi **chủ động thêm** `update-exam.dto.ts` và `map-exam-question.dto.ts` để code tách vai trò rõ hơn, tránh DTO phình to và giữ cohesion tốt.

---

## 1. DTOs

### File: `backend-nestjs/src/modules/exams/dto/create-answer-key.dto.ts`

```typescript
import { AnswerChoice } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class CreateAnswerKeyDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsEnum(AnswerChoice)
  correctAnswer!: AnswerChoice;
}
```

### File: `backend-nestjs/src/modules/exams/dto/map-exam-question.dto.ts`

```typescript
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MapExamQuestionDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsUUID()
  @IsOptional()
  questionId?: string;
}
```

### File: `backend-nestjs/src/modules/exams/dto/create-exam.dto.ts`

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAnswerKeyDto } from './create-answer-key.dto';
import { MapExamQuestionDto } from './map-exam-question.dto';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  maxScore!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  classIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerKeyDto)
  answerKeys!: CreateAnswerKeyDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MapExamQuestionDto)
  @IsOptional()
  questionMap?: MapExamQuestionDto[];
}
```

### File: `backend-nestjs/src/modules/exams/dto/update-exam.dto.ts`

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAnswerKeyDto } from './create-answer-key.dto';
import { MapExamQuestionDto } from './map-exam-question.dto';

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  maxScore?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  @IsOptional()
  classIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerKeyDto)
  @IsOptional()
  answerKeys?: CreateAnswerKeyDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MapExamQuestionDto)
  @IsOptional()
  questionMap?: MapExamQuestionDto[];
}
```

---

## 2. Repository

### File: `backend-nestjs/src/modules/exams/repositories/exams.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AnswerChoice, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const examDetailInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  classes: {
    include: {
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          schoolYear: true,
          code: true,
        },
      },
    },
  },
  answerKeys: {
    orderBy: {
      questionNumber: 'asc',
    },
  },
  questionMap: {
    include: {
      question: {
        select: {
          id: true,
          content: true,
          subject: true,
          difficulty: true,
        },
      },
    },
    orderBy: {
      questionNumber: 'asc',
    },
  },
} satisfies Prisma.ExamInclude;

@Injectable()
export class ExamsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createExam(data: {
    title: string;
    maxScore: number;
    teacherId: string;
    classIds: string[];
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: AnswerChoice;
    }>;
    questionMap: Array<{
      questionNumber: number;
      questionId?: string;
    }>;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          maxScore: data.maxScore,
          teacherId: data.teacherId,
        },
      });

      await tx.examClass.createMany({
        data: data.classIds.map((classId) => ({
          examId: exam.id,
          classId,
        })),
      });

      await tx.answerKey.createMany({
        data: data.answerKeys.map((item) => ({
          examId: exam.id,
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      });

      if (data.questionMap.length > 0) {
        await tx.examQuestion.createMany({
          data: data.questionMap.map((item) => ({
            examId: exam.id,
            questionNumber: item.questionNumber,
            questionId: item.questionId ?? null,
          })),
        });
      }

      return tx.exam.findUniqueOrThrow({
        where: { id: exam.id },
        include: examDetailInclude,
      });
    });
  }

  async listTeacherExams(teacherId: string) {
    return this.prismaService.exam.findMany({
      where: { teacherId },
      include: examDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTeacherExamById(examId: string, teacherId: string) {
    return this.prismaService.exam.findFirst({
      where: {
        id: examId,
        teacherId,
      },
      include: examDetailInclude,
    });
  }

  async findTeacherClassesByIds(teacherId: string, classIds: string[]) {
    return this.prismaService.class.findMany({
      where: {
        teacherId,
        id: {
          in: classIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findTeacherQuestionsByIds(teacherId: string, questionIds: string[]) {
    return this.prismaService.question.findMany({
      where: {
        teacherId,
        id: {
          in: questionIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async countExamDependencies(examId: string) {
    const [submissionCount, batchCount] = await this.prismaService.$transaction([
      this.prismaService.submission.count({
        where: { examId },
      }),
      this.prismaService.omrBatch.count({
        where: { examId },
      }),
    ]);

    return {
      submissionCount,
      batchCount,
    };
  }

  async updateExam(
    examId: string,
    teacherId: string,
    data: {
      title?: string;
      maxScore?: number;
      classIds: string[];
      answerKeys: Array<{
        questionNumber: number;
        correctAnswer: AnswerChoice;
      }>;
      questionMap: Array<{
        questionNumber: number;
        questionId?: string;
      }>;
    },
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          maxScore: data.maxScore,
        },
      });

      await tx.examClass.deleteMany({
        where: { examId },
      });

      await tx.answerKey.deleteMany({
        where: { examId },
      });

      await tx.examQuestion.deleteMany({
        where: { examId },
      });

      await tx.examClass.createMany({
        data: data.classIds.map((classId) => ({
          examId,
          classId,
        })),
      });

      await tx.answerKey.createMany({
        data: data.answerKeys.map((item) => ({
          examId,
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      });

      if (data.questionMap.length > 0) {
        await tx.examQuestion.createMany({
          data: data.questionMap.map((item) => ({
            examId,
            questionNumber: item.questionNumber,
            questionId: item.questionId ?? null,
          })),
        });
      }

      return tx.exam.findUniqueOrThrow({
        where: { id: examId },
        include: examDetailInclude,
      });
    });
  }

  async deleteExam(examId: string) {
    return this.prismaService.exam.delete({
      where: { id: examId },
    });
  }
}
```

---

## 3. Service

### File: `backend-nestjs/src/modules/exams/services/exams.service.ts`

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';
import { ExamsRepository } from '../repositories/exams.repository';

@Injectable()
export class ExamsService {
  constructor(private readonly examsRepository: ExamsRepository) {}

  async createExam(teacherId: string, createExamDto: CreateExamDto) {
    const normalized = this.normalizeExamPayload(createExamDto);

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);
    await this.ensureTeacherOwnsMappedQuestions(teacherId, normalized.questionMap);
    this.ensureQuestionMapMatchesAnswerKeys(
      normalized.answerKeys.map((item) => item.questionNumber),
      normalized.questionMap.map((item) => item.questionNumber),
    );

    return this.examsRepository.createExam({
      title: normalized.title,
      maxScore: normalized.maxScore,
      teacherId,
      classIds: normalized.classIds,
      answerKeys: normalized.answerKeys,
      questionMap: normalized.questionMap,
    });
  }

  async listTeacherExams(teacherId: string) {
    return this.examsRepository.listTeacherExams(teacherId);
  }

  async getTeacherExamById(examId: string, teacherId: string) {
    const exam = await this.examsRepository.findTeacherExamById(examId, teacherId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async updateExam(examId: string, teacherId: string, updateExamDto: UpdateExamDto) {
    const existingExam = await this.examsRepository.findTeacherExamById(examId, teacherId);

    if (!existingExam) {
      throw new NotFoundException('Exam not found');
    }

    const normalized = this.normalizeExamPayload({
      title: updateExamDto.title ?? existingExam.title,
      maxScore: updateExamDto.maxScore ?? existingExam.maxScore,
      classIds:
        updateExamDto.classIds ??
        existingExam.classes.map((item) => item.class.id),
      answerKeys:
        updateExamDto.answerKeys ??
        existingExam.answerKeys.map((item) => ({
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      questionMap:
        updateExamDto.questionMap ??
        existingExam.questionMap.map((item) => ({
          questionNumber: item.questionNumber,
          questionId: item.questionId ?? undefined,
        })),
    });

    const dependencies = await this.examsRepository.countExamDependencies(examId);
    const hasDependentData =
      dependencies.submissionCount > 0 || dependencies.batchCount > 0;

    if (
      hasDependentData &&
      (
        updateExamDto.answerKeys !== undefined ||
        updateExamDto.classIds !== undefined ||
        updateExamDto.questionMap !== undefined
      )
    ) {
      throw new BadRequestException(
        'Cannot change classes, answer keys, or question mapping after submissions or OMR batches already exist',
      );
    }

    await this.ensureTeacherOwnsClasses(teacherId, normalized.classIds);
    await this.ensureTeacherOwnsMappedQuestions(teacherId, normalized.questionMap);
    this.ensureQuestionMapMatchesAnswerKeys(
      normalized.answerKeys.map((item) => item.questionNumber),
      normalized.questionMap.map((item) => item.questionNumber),
    );

    return this.examsRepository.updateExam(examId, teacherId, {
      title: normalized.title,
      maxScore: normalized.maxScore,
      classIds: normalized.classIds,
      answerKeys: normalized.answerKeys,
      questionMap: normalized.questionMap,
    });
  }

  async deleteExam(examId: string, teacherId: string) {
    const exam = await this.examsRepository.findTeacherExamById(examId, teacherId);

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const dependencies = await this.examsRepository.countExamDependencies(examId);

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
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: CreateExamDto['answerKeys'][number]['correctAnswer'];
    }>;
    questionMap?: Array<{
      questionNumber: number;
      questionId?: string;
    }>;
  }) {
    const classIds = [...new Set(payload.classIds.map((item) => item.trim()))];

    if (classIds.length === 0) {
      throw new BadRequestException('At least one class must be assigned to the exam');
    }

    const answerKeys = [...payload.answerKeys]
      .map((item) => ({
        questionNumber: item.questionNumber,
        correctAnswer: item.correctAnswer,
      }))
      .sort((left, right) => left.questionNumber - right.questionNumber);

    this.ensureUniqueQuestionNumbers(
      answerKeys.map((item) => item.questionNumber),
      'Answer key question numbers must be unique',
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
      throw new BadRequestException('A question can only be mapped once in the same exam');
    }

    return {
      title: payload.title.trim(),
      maxScore: payload.maxScore,
      classIds,
      answerKeys,
      questionMap,
    };
  }

  private ensureUniqueQuestionNumbers(numbers: number[], message: string) {
    if (numbers.length !== new Set(numbers).size) {
      throw new BadRequestException(message);
    }
  }

  private ensureQuestionMapMatchesAnswerKeys(
    answerKeyNumbers: number[],
    mappedNumbers: number[],
  ) {
    const allowedNumbers = new Set(answerKeyNumbers);

    for (const questionNumber of mappedNumbers) {
      if (!allowedNumbers.has(questionNumber)) {
        throw new BadRequestException(
          `Question map contains questionNumber ${questionNumber} that does not exist in answer keys`,
        );
      }
    }
  }

  private async ensureTeacherOwnsClasses(teacherId: string, classIds: string[]) {
    const classes = await this.examsRepository.findTeacherClassesByIds(teacherId, classIds);

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
}
```

### Giải thích thiết kế

- `ExamsService` giữ business rules, không nhúng raw query phức tạp
- `ExamsRepository` chịu trách nhiệm transaction và truy vấn nhiều bảng liên quan
- khi đề đã có `Submission` hoặc `OmrBatch`, không cho sửa `classIds`, `answerKeys`, `questionMap` để tránh sai lệch dữ liệu chấm
- `questionMap` là optional, nên hệ thống vẫn chạy được cả khi chưa build xong `Question Bank`

---

## 4. Controller

### File: `backend-nestjs/src/modules/exams/controllers/exams.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';
import { ExamsService } from '../services/exams.service';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  async createExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(teacherId, createExamDto);
  }

  @Get('my')
  async listTeacherExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherExams(teacherId);
  }

  @Get(':id')
  async getTeacherExamById(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.getTeacherExamById(examId, teacherId);
  }

  @Patch(':id')
  async updateExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(examId, teacherId, updateExamDto);
  }

  @Delete(':id')
  async deleteExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.deleteExam(examId, teacherId);
  }
}
```

---

## 5. Module

### File: `backend-nestjs/src/modules/exams/exams.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ExamsController } from './controllers/exams.controller';
import { ExamsRepository } from './repositories/exams.repository';
import { ExamsService } from './services/exams.service';

@Module({
  controllers: [ExamsController],
  providers: [ExamsRepository, ExamsService],
  exports: [ExamsRepository, ExamsService],
})
export class ExamsModule {}
```

---

## 6. Cập nhật `app.module.ts`

Thêm `ExamsModule` vào root module:

```typescript
import { ExamsModule } from './modules/exams/exams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cloudinaryConfig, redisConfig],
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    ExamsModule,
  ],
})
export class AppModule {}
```

---

## 7. API nên có sau khi implement thật

### Teacher only

- `POST /exams`
- `GET /exams/my`
- `GET /exams/:id`
- `PATCH /exams/:id`
- `DELETE /exams/:id`

### Mẫu payload tạo đề thi

```json
{
  "title": "Kiem tra 15 phut Chuong 1",
  "maxScore": 10,
  "classIds": [
    "5f5d3f30-33f5-4d12-a9dc-3ef50118cb4d",
    "d82cdd98-17d7-47e4-b2ec-f1b58cafb848"
  ],
  "answerKeys": [
    { "questionNumber": 1, "correctAnswer": "A" },
    { "questionNumber": 2, "correctAnswer": "C" },
    { "questionNumber": 3, "correctAnswer": "B" }
  ],
  "questionMap": [
    {
      "questionNumber": 1,
      "questionId": "1024cdcb-22ab-4aa6-af32-6dc1a4ea2d3d"
    },
    {
      "questionNumber": 2,
      "questionId": "27ec7231-a635-4ca7-aea6-30eaac2cbf8a"
    }
  ]
}
```

### Mẫu payload cập nhật đề thi

```json
{
  "title": "Kiem tra 15 phut Chuong 1 - Updated",
  "maxScore": 10
}
```

---

## 8. Những rule nghiệp vụ quan trọng đã được code hóa

- một đề phải thuộc đúng `teacherId`
- một đề phải gắn ít nhất 1 lớp
- chỉ được gắn lớp của chính giáo viên đó
- `AnswerKey.questionNumber` phải unique trong cùng đề
- `questionMap.questionNumber` phải unique trong cùng đề
- một `questionId` chỉ được map 1 lần trong cùng đề
- `questionMap.questionNumber` chỉ được phép trỏ đến câu đã tồn tại trong `answerKeys`
- nếu đề đã có `Submission` hoặc `OmrBatch`, không cho sửa cấu trúc đề nữa
- nếu đề đã có `Submission` hoặc `OmrBatch`, không cho xóa

---

## 9. Vì sao thiết kế này chuẩn SOLID / Cohesion / Coupling

- `DTO` chỉ lo validate dữ liệu đầu vào
- `Controller` chỉ lo HTTP boundary và authorization
- `Service` chỉ giữ business rule của use case tạo/cập nhật/xóa đề
- `Repository` gom toàn bộ query/transaction phức tạp của `Exam`, `ExamClass`, `AnswerKey`, `ExamQuestion`
- module `exams` không phụ thuộc trực tiếp vào `classes.service` hay `question-bank.service`, mà chỉ kiểm ownership qua repository/query, giúp coupling thấp hơn

---

## 10. Giai đoạn tiếp theo sau `Exams Module`

Sau khi làm xong module này trong code thật, bước kế tiếp nên là:

1. `Submissions Module`
2. `OMR Module`
3. `Manual Override`

Lý do:

- `Exams` đã tạo đủ đầu vào để OMR chấm bài
- `AnswerKey` và `ExamClass` đã sẵn sàng cho flow upload/chấm
- `Submission` là nơi tiêu thụ trực tiếp dữ liệu từ `OMR Service`
