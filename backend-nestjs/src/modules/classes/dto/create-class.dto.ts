import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must match YYYY-YYYY format',
  })
  schoolYear!: string;
}