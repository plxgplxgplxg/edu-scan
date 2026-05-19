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
import { RemarkStatus, Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { RemarksSwagger } from '../docs/remarks.swagger';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { ReviewRemarkRequestDto } from '../dtos/review-remark.dto';
import { RemarksService } from '../services/remarks.service';

type RemarkRequestUser = {
  id: string;
  role?: Role;
};

type RemarkRequest = {
  user: RemarkRequestUser;
};

@RemarksSwagger.Controller()
@Controller('remarks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemarksController {
  constructor(private readonly remarksService: RemarksService) {}

  @Post()
  @Roles(Role.STUDENT)
  @RemarksSwagger.TaoYeuCauPhucKhao()
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
  @RemarksSwagger.LayDanhSachYeuCauPhucKhao()
  async getRemarks(@Query('status') status?: RemarkStatus) {
    const data = await this.remarksService.getRemarks(status);
    return {
      message: 'Lấy danh sách yêu cầu phúc khảo thành công',
      data,
    };
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @RemarksSwagger.LayDanhSachYeuCauPhucKhaoCuaToi()
  async getMyRemarks(@Req() req: RemarkRequest) {
    const data = await this.remarksService.getMyRemarks(req.user.id);
    return {
      message: 'Lấy danh sách yêu cầu phúc khảo của tôi thành công',
      data,
    };
  }

  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.ADMIN)
  @RemarksSwagger.DuyetYeuCauPhucKhao()
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
