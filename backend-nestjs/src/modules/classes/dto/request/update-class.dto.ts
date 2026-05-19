import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must match YYYY-YYYY format',
  })
  schoolYear?: string;
}
