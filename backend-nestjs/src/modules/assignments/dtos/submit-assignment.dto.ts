import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
