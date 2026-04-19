import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RemarksService } from '../services/remarks.service';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { ReviewRemarkRequestDto } from '../dtos/review-remark.dto';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { Role, RemarkStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';

@Controller('remarks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemarksController {
  constructor(private readonly remarksService: RemarksService) {}

  @Post()
  @Roles(Role.STUDENT)
  async createRemark(@Request() req: any, @Body() dto: CreateRemarkRequestDto) {
    const data = await this.remarksService.createRemark(req.user.id, dto);
    return {
      message: 'Remark request created successfully',
      data,
    };
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN)
  async getRemarks(@Query('status') status?: RemarkStatus) {
    const data = await this.remarksService.getRemarks(status);
    return {
      message: 'Remarks retrieved successfully',
      data,
    };
  }

  @Patch(':id/review')
  @Roles(Role.TEACHER, Role.ADMIN)
  async reviewRemark(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReviewRemarkRequestDto,
  ) {
    const data = await this.remarksService.reviewRemark(id, req.user.id, dto);
    return {
      message: 'Remark reviewed successfully',
      data,
    };
  }
}
