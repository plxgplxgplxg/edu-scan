import { IsNotEmpty, IsString, MaxLength, IsUUID } from 'class-validator';

export class CreateRemarkRequestDto {
  @IsUUID()
  @IsNotEmpty()
  submissionDetailId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
