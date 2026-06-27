import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { SubmissionsSwagger } from '../docs/submissions.swagger';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { QueryMySubmissionsDto } from '../dtos/query-my-submissions.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { UpdateSubmissionAnswersDto } from '../dtos/update-submission-answers.dto';
import { SubmissionsService } from '../services/submissions.service';

type RequestUser = { id: string; role: string };
type AuthenticatedRequest = { user: RequestUser };

@SubmissionsSwagger.Controller()
@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @SubmissionsSwagger.LayDanhSachBaiLam()
  findAll(@Query() query: GetSubmissionsQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @SubmissionsSwagger.LayDanhSachBaiLamCuaToi()
  findMySubmissions(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryMySubmissionsDto,
  ) {
    return this.submissionsService.findMySubmissions(req.user, query);
  }

  @Get('me/progress')
  @Roles(Role.STUDENT)
  @SubmissionsSwagger.LayTienDoCuaToi()
  getMyProgress(@Request() req: AuthenticatedRequest) {
    return this.submissionsService.getMyProgress(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @SubmissionsSwagger.LayChiTietBaiLam()
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.submissionsService.findOneWithScore(id, req.user);
  }

  @Patch(':id/override')
  @Roles(Role.ADMIN, Role.TEACHER)
  @SubmissionsSwagger.OverrideThuCongBaiLam()
  manualOverride(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionOverrideDto,
  ) {
    return this.submissionsService.manualOverride(id, dto);
  }

  @Patch(':id/answers')
  @Roles(Role.ADMIN, Role.TEACHER)
  updateAnswers(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionAnswersDto,
  ) {
    return this.submissionsService.updateSubmissionAnswers(id, dto);
  }
}
