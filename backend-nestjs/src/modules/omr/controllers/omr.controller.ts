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
    summary: 'Tải lên batch ảnh OMR cho một đề thi',
    roles: [Role.TEACHER],
    notes:
      'Gửi `multipart/form-data`. Trường `files` chấp nhận tối đa 50 file trong một batch upload.',
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
    description: 'Tạo batch upload OMR thành công.',
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
    summary: 'Lấy chi tiết batch OMR',
    roles: [Role.TEACHER],
    notes:
      'Trả về trạng thái batch, số lượng file, thống kê xử lý và danh sách submission được sinh từ batch.',
  })
  @ApiParam({ name: 'batchId', description: 'ID batch OMR', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: OmrBatchResponseDto,
    description: 'Lấy chi tiết batch OMR thành công.',
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
    summary: 'Lấy chi tiết submission OMR',
    roles: [Role.TEACHER],
    notes:
      'Dùng để xem kết quả nhận dạng, mã đề được resolve, đáp án từng câu và các file ảnh liên quan.',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'ID bài làm OMR',
    format: 'uuid',
  })
  @ApiWrappedOkResponse({
    type: OmrSubmissionDetailViewResponseDto,
    description: 'Lấy chi tiết submission OMR thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getSubmissionById(
    @Param('submissionId') submissionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.omrService.getSubmissionById(submissionId, teacherId);
  }
}
