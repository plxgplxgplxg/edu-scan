import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubmissionsService } from '../services/submissions.service';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { QueryMySubmissionsDto } from '../dtos/query-my-submissions.dto';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { Role } from '@prisma/client';

type RequestUser = { id: string; role: string };
type AuthenticatedRequest = { user: RequestUser };

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Query() query: GetSubmissionsQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  findMySubmissions(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryMySubmissionsDto,
  ) {
    return this.submissionsService.findMySubmissions(req.user, query);
  }

  @Get('me/progress')
  @Roles(Role.STUDENT)
  getMyProgress(@Request() req: AuthenticatedRequest) {
    return this.submissionsService.getMyProgress(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.submissionsService.findOneWithScore(id, req.user);
  }

  @Patch(':id/override')
  @Roles(Role.ADMIN, Role.TEACHER)
  manualOverride(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionOverrideDto,
  ) {
    return this.submissionsService.manualOverride(id, dto);
  }
}
