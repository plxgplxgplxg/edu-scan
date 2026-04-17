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
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Query() query: GetSubmissionsQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string, @Request() req: any) {
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
