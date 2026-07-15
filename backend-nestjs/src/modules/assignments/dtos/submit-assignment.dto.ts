import { IsOptional, IsString } from 'class-validator';

import { Transform } from 'class-transformer';

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  attachments?: any[];
}
