import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReportDocumentDto } from '../dto/response/export-class-report-response.dto';
import { ReportGenerator } from './report-generator.interface';

@Injectable()
export class PdfGeneratorService implements ReportGenerator {
  async generate(document: ReportDocumentDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      doc.fontSize(16).text('Class Score Report');
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Class: ${document.classInfo.name}`);
      doc.text(`Subject: ${document.classInfo.subject}`);
      doc.text(`School Year: ${document.classInfo.schoolYear}`);
      doc.text(`Scope: ${document.scope}`);
      doc.text(`Generated At: ${document.generatedAt.toISOString()}`);
      doc.moveDown(1);

      if (document.scope === 'all') {
        doc.fontSize(11).text('Exams in scope:');
        for (const exam of document.exams) {
          doc.fontSize(10).text(`- ${exam.title} (max ${exam.maxScore})`);
        }
        doc.moveDown(0.7);
        doc
          .fontSize(10)
          .text('Student Code | Student Name | Taken Exams | Avg');
        doc.moveDown(0.3);

        for (const row of document.rows) {
          doc.text(
            `${row.studentCode ?? 'N/A'} | ${row.studentName} | ${row.takenExams} | ${
              row.averageScore === null ? 'N/A' : roundScore(row.averageScore)
            }`,
          );
        }
      } else {
        doc.fontSize(10).text('Student Code | Student Name | Score');
        doc.moveDown(0.3);

        const examId = document.exams[0]?.id;
        for (const row of document.rows) {
          const score = examId ? row.scoresByExamId[examId] : null;
          doc.text(
            `${row.studentCode ?? 'N/A'} | ${row.studentName} | ${score === null || score === undefined ? 'N/A' : roundScore(score)}`,
          );
        }
      }

      doc.end();
    });
  }
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
