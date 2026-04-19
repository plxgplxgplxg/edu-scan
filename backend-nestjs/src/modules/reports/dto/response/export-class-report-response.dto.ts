export type ReportClassInfoDto = {
  id: string;
  name: string;
  subject: string;
  schoolYear: string;
};

export type ReportExamDto = {
  id: string;
  title: string;
  maxScore: number;
};

export type ReportStudentRowDto = {
  studentId: string;
  studentCode: string | null;
  studentName: string;
  studentEmail: string;
  scoresByExamId: Record<string, number | null>;
  totalScore: number;
  averageScore: number | null;
  takenExams: number;
};

export type ReportDocumentDto = {
  classInfo: ReportClassInfoDto;
  exams: ReportExamDto[];
  rows: ReportStudentRowDto[];
  scope: string;
  generatedAt: Date;
};

export type ExportedReportFileDto = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};
