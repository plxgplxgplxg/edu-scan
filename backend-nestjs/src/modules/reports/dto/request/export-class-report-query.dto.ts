import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReportFormat {
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export enum ReportScope {
  ALL = 'all',
}

export class ExportClassReportQueryDto {
  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @IsOptional()
  @IsString()
  scope?: string;
}
