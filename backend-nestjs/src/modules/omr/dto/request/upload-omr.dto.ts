import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadOmrDto {
  @IsUUID()
  @IsNotEmpty()
  examId!: string;

  @IsOptional()
  @IsString()
  templateName?: string;
}
