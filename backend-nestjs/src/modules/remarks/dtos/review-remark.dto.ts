import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { RemarkStatus, AnswerChoice } from '@prisma/client';

export class ReviewRemarkRequestDto {
  @IsEnum(RemarkStatus)
  @IsNotEmpty()
  status: RemarkStatus;

  @ValidateIf(o => o.status === RemarkStatus.REJECTED)
  @IsNotEmpty({ message: 'Teacher comment is required when rejecting a remark request' })
  @IsString()
  teacherComment?: string;

  @ValidateIf(o => o.status === RemarkStatus.APPROVED)
  @IsNotEmpty({ message: 'Final answer is required when approving a remark request' })
  @IsEnum(AnswerChoice)
  finalAnswer?: AnswerChoice;
}
