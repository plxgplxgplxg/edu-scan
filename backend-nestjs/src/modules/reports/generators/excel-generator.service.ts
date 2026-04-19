import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ReportDocumentDto } from '../dto/response/export-class-report-response.dto';
import { ReportGenerator } from './report-generator.interface';

@Injectable()
export class ExcelGeneratorService implements ReportGenerator {
  async generate(document: ReportDocumentDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Class Report');

    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: 'Student Code', key: 'studentCode', width: 16 },
      { header: 'Student Name', key: 'studentName', width: 28 },
      { header: 'Email', key: 'studentEmail', width: 30 },
    ];

    for (const exam of document.exams) {
      columns.push({
        header: `${exam.title} (${exam.maxScore})`,
        key: `exam_${exam.id}`,
        width: 20,
      });
    }

    columns.push({ header: 'Total Score', key: 'totalScore', width: 14 });
    columns.push({ header: 'Average Score', key: 'averageScore', width: 14 });
    columns.push({ header: 'Taken Exams', key: 'takenExams', width: 12 });

    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    for (const row of document.rows) {
      const output: Record<string, string | number> = {
        studentCode: row.studentCode ?? 'N/A',
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        totalScore: roundScore(row.totalScore),
        averageScore:
          row.averageScore === null ? 'N/A' : roundScore(row.averageScore),
        takenExams: row.takenExams,
      };

      for (const exam of document.exams) {
        const score = row.scoresByExamId[exam.id];
        output[`exam_${exam.id}`] =
          score === null || score === undefined ? 'N/A' : roundScore(score);
      }

      worksheet.addRow(output);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer as ArrayBuffer);
  }
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
