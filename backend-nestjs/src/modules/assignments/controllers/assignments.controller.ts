import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { AssignmentsSwagger } from '../docs/assignments.swagger';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import { UpdateAssignmentDto } from '../dtos/update-assignment.dto';
import { UpdateSubmitDto } from '../dtos/update-submit.dto';
import { AssignmentsService } from '../services/assignments.service';

type AssignmentRequestUser = {
  id: string;
  role: Role;
};

type AssignmentRequest = {
  user: AssignmentRequestUser;
};

@AssignmentsSwagger.Controller()
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @UseInterceptors(FilesInterceptor('instructionFiles', 5))
  @AssignmentsSwagger.TaoBaiTap()
  create(
    @Body() dto: CreateAssignmentDto,
    @Req() req: AssignmentRequest,
    @UploadedFiles() instructionFiles?: Express.Multer.File[],
  ) {
    return this.assignmentsService.createAssignment(
      req.user.id,
      dto,
      instructionFiles,
    );
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @UseInterceptors(FilesInterceptor('instructionFiles', 5))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req: AssignmentRequest,
    @UploadedFiles() instructionFiles?: Express.Multer.File[],
  ) {
    return this.assignmentsService.updateAssignment(id, req.user.id, dto, instructionFiles);
  }

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT)
  @AssignmentsSwagger.LayDanhSachBaiTap()
  findAll(@Req() req: AssignmentRequest) {
    if (req.user.role === Role.TEACHER) {
      return this.assignmentsService.listAssignmentsForTeacher(req.user.id);
    }

    return this.assignmentsService.listAssignmentsForStudent(req.user.id);
  }

  @Get(':id/submits')
  @Roles(Role.TEACHER)
  @AssignmentsSwagger.LayDanhSachBaiNop()
  getSubmits(
    @Param('id') id: string,
    @Req() req: AssignmentRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.assignmentsService.getSubmitsForTeacher(id, req.user.id, pageNum, limitNum);
  }

  @Post(':id/submits')
  @Roles(Role.STUDENT)
  @UseInterceptors(FilesInterceptor('files', 5))
  @AssignmentsSwagger.NopBaiTap()
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @Req() req: AssignmentRequest,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.assignmentsService.submitAssignment(id, req.user.id, dto, files);
  }

  @Patch(':id/submits')
  @Roles(Role.STUDENT)
  @UseInterceptors(FilesInterceptor('files', 5))
  updateSubmit(
    @Param('id') id: string,
    @Body() dto: UpdateSubmitDto,
    @Req() req: AssignmentRequest,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.assignmentsService.updateStudentSubmit(id, req.user.id, dto, files);
  }

  @Get(':id/submits/me')
  @Roles(Role.STUDENT)
  @AssignmentsSwagger.LayBaiNopCuaToi()
  getMySubmit(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.getMySubmit(id, req.user.id);
  }

  @Patch(':id/submits/:submitId/grade')
  @Roles(Role.TEACHER)
  @AssignmentsSwagger.ChamDiemBaiNop()
  grade(
    @Param('id') id: string,
    @Param('submitId') submitId: string,
    @Body() dto: GradeSubmitDto,
    @Req() req: AssignmentRequest,
  ) {
    return this.assignmentsService.gradeSubmit(id, submitId, req.user.id, dto);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  delete(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.deleteAssignment(id, req.user.id);
  }
}
