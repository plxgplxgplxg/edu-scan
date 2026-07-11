import { IsOptional, IsString } from 'class-validator';

export class LateMissingQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  timeRange?: string; // e.g. 'month', 'week', 'all'
}
