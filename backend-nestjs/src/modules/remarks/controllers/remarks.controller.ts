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
  role: Role;
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
    summary: 'Sinh vien tao yeu cau phuc khao',
    roles: [Role.STUDENT],
  })
  @ApiBody({ type: CreateRemarkRequestDto })
  @ApiWrappedCreatedResponse({
    type: RemarkResponseDto,
    description: 'Tao yeu cau phuc khao thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 409, 500)
  async createRemark(
    @Req() req: RemarkRequest,
    @Body() dto: CreateRemarkRequestDto,
  ) {
    const data = await this.remarksService.createRemark(req.user.id, dto);
    return {
      message: 'Remark request created successfully',
      data,
    };
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerOperation({
    summary: 'Lay danh sach yeu cau phuc khao',
    roles: [Role.TEACHER, Role.ADMIN],
  })
  @ApiQuery({ name: 'status', required: false, enum: RemarkStatus })
  @ApiWrappedOkResponse({
    type: RemarkResponseDto,
    isArray: true,
    description: 'Lay danh sach yeu cau phuc khao thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async getRemarks(@Query('status') status?: RemarkStatus) {
    const data = await this.remarksService.getRemarks(status);
    return {
      message: 'Remarks retrieved successfully',
      data,
    };
  }

  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiBearerOperation({
    summary: 'Review yeu cau phuc khao',
    roles: [Role.TEACHER, Role.ADMIN],
    notes:
      'APPROVED yeu cau finalAnswer. REJECTED yeu cau teacherComment theo business rule hien tai.',
  })
  @ApiParam({ name: 'id', description: 'Remark request id', format: 'uuid' })
  @ApiBody({ type: ReviewRemarkRequestDto })
  @ApiWrappedOkResponse({
    type: RemarkResponseDto,
    description: 'Review yeu cau phuc khao thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 409, 500)
  async reviewRemark(
    @Param('id') id: string,
    @Req() req: RemarkRequest,
    @Body() dto: ReviewRemarkRequestDto,
  ) {
    const data = await this.remarksService.reviewRemark(id, req.user.id, dto);
    return {
      message: 'Remark reviewed successfully',
      data,
    };
  }
}
