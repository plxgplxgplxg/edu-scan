import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsRepository } from './repositories/reports.repository';
import { ReportsService } from './services/reports.service';
import { ExcelGeneratorService } from './generators/excel-generator.service';
import { PdfGeneratorService } from './generators/pdf-generator.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRepository,
    ExcelGeneratorService,
    PdfGeneratorService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
