import { ApiProperty } from '@nestjs/swagger';
import { ReportFormat } from '../request/export-class-report-query.dto';

export class ReportExportJobResponseDto {
  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  status!: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @ApiProperty({ enum: ReportFormat, enumName: 'ReportFormat' })
  format!: ReportFormat;

  @ApiProperty()
  scope!: string;

  @ApiProperty({ nullable: true })
  fileName!: string | null;

  @ApiProperty({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: string | null;
}
