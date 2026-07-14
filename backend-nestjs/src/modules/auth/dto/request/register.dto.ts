import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export type RegisterRole = 'TEACHER' | 'STUDENT';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmPassword!: string;

  @IsIn(['TEACHER', 'STUDENT'])
  role!: RegisterRole;
}
