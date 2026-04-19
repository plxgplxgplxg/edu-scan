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
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { UploadOmrDto } from '../dto/request/upload-omr.dto';
import {
  OmrBatchResponseDto,
  OmrSubmissionDetailViewResponseDto,
} from '../dto/response/omr-batch-response.dto';
import { OmrService } from '../services/omr.service';

@ApiTags('omr')
@Controller('omr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class OmrController {
  constructor(private readonly omrService: OmrService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50))
  @ApiBearerOperation({
    summary: 'Upload batch anh OMR cho mot exam',
    roles: [Role.TEACHER],
    notes:
      'Multipart/form-data. Truong files chap nhan toi da 50 file trong mot batch.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['examId', 'files'],
      properties: {
        examId: { type: 'string', format: 'uuid' },
        templateName: { type: 'string', nullable: true },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiWrappedCreatedResponse({
    type: OmrBatchResponseDto,
    description: 'Tao batch upload OMR thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async uploadOmrBatch(
    @CurrentUser('id') teacherId: string,
    @Body() uploadOmrDto: UploadOmrDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.omrService.uploadExamSheets(teacherId, uploadOmrDto, files);
  }

  @Get('batch/:batchId')
  @ApiBearerOperation({
    summary: 'Lay chi tiet batch OMR',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'batchId', description: 'OMR batch id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: OmrBatchResponseDto,
    description: 'Lay chi tiet batch OMR thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getBatchById(
    @Param('batchId') batchId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.omrService.getBatchById(batchId, teacherId);
  }

  @Get('submissions/:submissionId')
  @ApiBearerOperation({
    summary: 'Lay chi tiet submission OMR',
    roles: [Role.TEACHER],
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Submission id',
    format: 'uuid',
  })
  @ApiWrappedOkResponse({
    type: OmrSubmissionDetailViewResponseDto,
    description: 'Lay chi tiet submission OMR thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getSubmissionById(
    @Param('submissionId') submissionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.omrService.getSubmissionById(submissionId, teacherId);
  }
}
