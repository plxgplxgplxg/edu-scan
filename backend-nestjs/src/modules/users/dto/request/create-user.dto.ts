import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @ValidateIf((dto: CreateUserDto) => dto.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]{4,30}$/, {
    message: 'studentCode must contain 4-30 uppercase letters, numbers, "_" or "-"',
  })
  studentCode?: string;
}
