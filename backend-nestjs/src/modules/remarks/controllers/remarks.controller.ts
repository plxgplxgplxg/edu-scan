import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RemarkStatus, Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { RemarkResponseDto } from '../dtos/response/remark-response.dto';
import { ReviewRemarkRequestDto } from '../dtos/review-remark.dto';
import { RemarksService } from '../services/remarks.service';

type RemarkRequestUser = {
  id: string;
  role?: Role;
};

type RemarkRequest = {
  user: RemarkRequestUser;
};

@ApiTags('remarks')
@Controller('remarks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemarksController {
  constructor(private readonly remarksService: RemarksService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Học sinh tạo yêu cầu phúc khảo',
    roles: [Role.STUDENT],
    notes:
      'Học sinh gửi yêu cầu phúc khảo cho một bài làm hoặc một câu hỏi cụ thể theo dữ liệu trong request body.',
  })
  @ApiBody({ type: CreateRemarkRequestDto })
  @ApiWrappedCreatedResponse({
    type: RemarkResponseDto,
    description: 'Tạo yêu cầu phúc khảo thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 409, 500)
  async createRemark(
    @Req() req: RemarkRequest,
    @Body() dto: CreateRemarkRequestDto,
  ) {
    const data = await this.remarksService.createRemark(req.user.id, dto);
    return {
      message: 'Tạo yêu cầu phúc khảo thành công',
      data,
    };
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerOperation({
    summary: 'Lấy danh sách yêu cầu phúc khảo',
    roles: [Role.TEACHER, Role.ADMIN],
    notes:
      'TEACHER và ADMIN có thể lọc theo trạng thái để theo dõi luồng xử lý phúc khảo.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RemarkStatus,
    description: 'Lọc yêu cầu phúc khảo theo trạng thái xử lý',
  })
  @ApiWrappedOkResponse({
    type: RemarkResponseDto,
    isArray: true,
    description: 'Lấy danh sách yêu cầu phúc khảo thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async getRemarks(@Query('status') status?: RemarkStatus) {
    const data = await this.remarksService.getRemarks(status);
    return {
      message: 'Lấy danh sách yêu cầu phúc khảo thành công',
      data,
    };
  }

  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerOperation({
    summary: 'Duyệt yêu cầu phúc khảo',
    roles: [Role.TEACHER, Role.ADMIN],
    notes:
      'Khi `APPROVED` cần cung cấp `finalAnswer`. Khi `REJECTED` cần cung cấp `teacherComment` theo business rule hiện tại.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID yêu cầu phúc khảo',
    format: 'uuid',
  })
  @ApiBody({ type: ReviewRemarkRequestDto })
  @ApiWrappedOkResponse({
    type: RemarkResponseDto,
    description: 'Duyệt yêu cầu phúc khảo thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 409, 500)
  async reviewRemark(
    @Param('id') id: string,
    @Req() req: RemarkRequest,
    @Body() dto: ReviewRemarkRequestDto,
  ) {
    const data = await this.remarksService.reviewRemark(id, req.user.id, dto);
    return {
      message: 'Duyệt yêu cầu phúc khảo thành công',
      data,
    };
  }
}
