import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExportedReportFileDto,
  ReportDocumentDto,
  ReportExamDto,
  ReportStudentRowDto,
} from '../dto/response/export-class-report-response.dto';
import {
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';
import { ReportsRepository } from '../repositories/reports.repository';
import { ReportGenerator } from '../generators/report-generator.interface';
import { ExcelGeneratorService } from '../generators/excel-generator.service';
import { PdfGeneratorService } from '../generators/pdf-generator.service';

type ExportClassReportInput = {
  classId: string;
  teacherId: string;
  format: ReportFormat;
  scope: string;
};

@Injectable()
export class ReportsService {
  private readonly generators: Record<ReportFormat, ReportGenerator>;

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly excelGenerator: ExcelGeneratorService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {
    this.generators = {
      [ReportFormat.XLSX]: this.excelGenerator,
      [ReportFormat.PDF]: this.pdfGenerator,
    };
  }

  async exportClassReport(
    input: ExportClassReportInput,
  ): Promise<ExportedReportFileDto> {
    const normalizedScope = input.scope || ReportScope.ALL;

    const classInfo = await this.reportsRepository.findTeacherClassById(
      input.classId,
      input.teacherId,
    );

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const enrollments = await this.reportsRepository.findClassEnrollments(
      input.classId,
      input.teacherId,
    );

    if (enrollments.length === 0) {
      throw new BadRequestException('Class has no enrolled students to export');
    }

    const exams = await this.reportsRepository.findClassExamsByScope({
      classId: input.classId,
      teacherId: input.teacherId,
      scope: normalizedScope,
    });

    if (normalizedScope !== 'all' && exams.length === 0) {
      throw new NotFoundException('Exam not found in this class scope');
    }

    if (exams.length === 0) {
      throw new BadRequestException('No exams found for the selected scope');
    }

    const submissions =
      await this.reportsRepository.findSubmissionsForClassScope({
        classId: input.classId,
        teacherId: input.teacherId,
        examIds: exams.map((exam) => exam.id),
      });

    if (submissions.length === 0) {
      throw new BadRequestException(
        'No submission data found for the selected scope',
      );
    }

    const rows = this.buildRows({
      enrollments,
      exams,
      submissions,
    });

    const hasScoreData = rows.some((row) => row.takenExams > 0);

    if (!hasScoreData) {
      throw new BadRequestException(
        'No graded score data found for the selected scope',
      );
    }

    const document: ReportDocumentDto = {
      classInfo,
      exams,
      rows,
      scope: normalizedScope,
      generatedAt: new Date(),
    };

    const generator = this.generators[input.format];
    const buffer = await generator.generate(document);

    const fileName = this.buildFileName({
      classId: input.classId,
      format: input.format,
      scope: normalizedScope,
    });

    return {
      fileName,
      mimeType: this.resolveMimeType(input.format),
      buffer,
    };
  }

  private buildRows(params: {
    enrollments: Array<{
      student: {
        id: string;
        studentCode: string | null;
        name: string;
        email: string;
      };
    }>;
    exams: ReportExamDto[];
    submissions: Array<{
      studentId: string | null;
      exam: { id: string; maxScore: number };
      details: Array<{ questionNumber: number; finalAnswer: string | null }>;
      resolvedVariant: {
        answerKeys: Array<{ questionNumber: number; correctAnswer: string }>;
      } | null;
      reviewedAt: Date | null;
      createdAt: Date;
    }>;
  }): ReportStudentRowDto[] {
    const latestSubmissionMap = new Map<string, number | null>();

    for (const submission of params.submissions) {
      if (!submission.studentId) {
        continue;
      }

      const key = `${submission.studentId}:${submission.exam.id}`;
      if (latestSubmissionMap.has(key)) {
        continue;
      }

      latestSubmissionMap.set(key, calculateScore(submission));
    }

    return params.enrollments.map((enrollment) => {
      const scoresByExamId: Record<string, number | null> = {};
      let totalScore = 0;
      let takenExams = 0;

      for (const exam of params.exams) {
        const key = `${enrollment.student.id}:${exam.id}`;
        const score = latestSubmissionMap.get(key) ?? null;
        scoresByExamId[exam.id] = score;

        if (score !== null) {
          totalScore += score;
          takenExams += 1;
        }
      }

      return {
        studentId: enrollment.student.id,
        studentCode: enrollment.student.studentCode,
        studentName: enrollment.student.name,
        studentEmail: enrollment.student.email,
        scoresByExamId,
        totalScore,
        averageScore: takenExams > 0 ? totalScore / takenExams : null,
        takenExams,
      };
    });
  }

  private buildFileName(params: {
    classId: string;
    format: ReportFormat;
    scope: string;
  }) {
    const extension = params.format === ReportFormat.XLSX ? 'xlsx' : 'pdf';
    const scopePart = params.scope === 'all' ? 'all' : params.scope;

    return `${params.classId}-${scopePart}-report.${extension}`;
  }

  private resolveMimeType(format: ReportFormat) {
    if (format === ReportFormat.XLSX) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return 'application/pdf';
  }
}

function calculateScore(submission: {
  exam: { maxScore: number };
  details: Array<{ questionNumber: number; finalAnswer: string | null }>;
  resolvedVariant: {
    answerKeys: Array<{ questionNumber: number; correctAnswer: string }>;
  } | null;
}): number | null {
  if (
    !submission.resolvedVariant ||
    submission.resolvedVariant.answerKeys.length === 0
  ) {
    return null;
  }

  const answerMap = new Map<number, string>();
  for (const key of submission.resolvedVariant.answerKeys) {
    answerMap.set(key.questionNumber, key.correctAnswer);
  }

  if (answerMap.size === 0) {
    return null;
  }

  let correctCount = 0;
  for (const detail of submission.details) {
    const expected = answerMap.get(detail.questionNumber);
    if (expected && detail.finalAnswer === expected) {
      correctCount += 1;
    }
  }

  const rawScore = (correctCount / answerMap.size) * submission.exam.maxScore;
  return Math.round(rawScore * 100) / 100;
}
