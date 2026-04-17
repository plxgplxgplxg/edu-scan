import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from '../services/assignments.service';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.TEACHER)
  create(@Body() dto: CreateAssignmentDto, @Request() req: any) {
    return this.assignmentsService.createAssignment(req.user.id, dto);
  }

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT)
  findAll(@Request() req: any) {
    if (req.user.role === Role.TEACHER) {
      return this.assignmentsService.listAssignmentsForTeacher(req.user.id);
    }
    return this.assignmentsService.listAssignmentsForStudent(req.user.id);
  }

  @Get(':id/submits')
  @Roles(Role.TEACHER)
  getSubmits(@Param('id') id: string, @Request() req: any) {
    return this.assignmentsService.getSubmitsForTeacher(id, req.user.id);
  }

  @Post(':id/submits')
  @Roles(Role.STUDENT)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.submitAssignment(id, req.user.id, dto);
  }

  @Get(':id/submits/me')
  @Roles(Role.STUDENT)
  getMySubmit(@Param('id') id: string, @Request() req: any) {
    return this.assignmentsService.getMySubmit(id, req.user.id);
  }

  @Patch(':id/submits/:submitId/grade')
  @Roles(Role.TEACHER)
  grade(
    @Param('id') id: string,
    @Param('submitId') submitId: string,
    @Body() dto: GradeSubmitDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.gradeSubmit(id, submitId, req.user.id, dto);
  }
}
