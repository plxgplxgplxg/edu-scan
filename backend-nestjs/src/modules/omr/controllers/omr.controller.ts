import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { OmrSwagger } from '../docs/omr.swagger';
import { UploadOmrDto } from '../dto/request/upload-omr.dto';
import { OmrService } from '../services/omr.service';

@OmrSwagger.Controller()
@Controller('omr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class OmrController {
  constructor(private readonly omrService: OmrService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50))
  @OmrSwagger.TaiLenBatchOmr()
  async uploadOmrBatch(
    @CurrentUser('id') teacherId: string,
    @Body() uploadOmrDto: UploadOmrDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.omrService.uploadExamSheets(teacherId, uploadOmrDto, files);
  }

  @Get('batch/:batchId')
  @OmrSwagger.LayChiTietBatchOmr()
  async getBatchById(
    @Param('batchId') batchId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.omrService.getBatchById(batchId, teacherId);
  }

  @Get('submissions/:submissionId')
  @OmrSwagger.LayChiTietBaiLamOmr()
  async getSubmissionById(
    @Param('submissionId') submissionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.omrService.getSubmissionById(submissionId, teacherId);
  }
}
