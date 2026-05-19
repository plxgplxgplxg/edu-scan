import { Body, Controller, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { SubmissionsService } from '../services/submissions.service';

type AuthenticatedRequest = { user: { id: string; role: string } };

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassExamSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('class-exams/:id/submissions')
  @Roles(Role.STUDENT)
  submitClassExam(
    @Param('id') examId: string,
    @Request() req: AuthenticatedRequest,
    @Body()
    payload: {
      answers: Array<{
        questionId: string;
        selectedChoice?: 'A' | 'B' | 'C' | 'D';
        essayAnswer?: string;
      }>;
    },
  ) {
    return this.submissionsService.submitClassExam(examId, req.user.id, payload);
  }

  @Patch('class-exam-submissions/:id/grade')
  @Roles(Role.TEACHER)
  gradeClassExamSubmission(
    @Param('id') submissionId: string,
    @Request() req: AuthenticatedRequest,
    @Body() payload: { manualScores: Array<{ answerId: string; manualScore: number }> },
  ) {
    return this.submissionsService.gradeClassExamSubmission(submissionId, req.user.id, payload);
  }
}
