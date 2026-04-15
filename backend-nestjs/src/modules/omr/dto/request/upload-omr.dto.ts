import { IsNotEmpty, IsUUID } from 'class-validator';

export class UploadOmrDto {
  @IsUUID()
  @IsNotEmpty()
  examId!: string;
}
