import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ValidateIf(
    (dto: UpdateUserDto) =>
      dto.role === Role.STUDENT || dto.studentCode !== undefined,
  )
  @IsString()
  @Matches(/^[A-Z0-9_-]{4,30}$/, {
    message:
      'studentCode must contain 4-30 uppercase letters, numbers, "_" or "-"',
  })
  @IsOptional()
  studentCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
