import { ReportDocumentDto } from '../dto/response/export-class-report-response.dto';

export interface ReportGenerator {
  generate(document: ReportDocumentDto): Promise<Buffer>;
}
