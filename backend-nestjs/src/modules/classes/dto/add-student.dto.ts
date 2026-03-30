import { IsEmail, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class AddStudentDto {
    @ValidateIf((dto: AddStudentDto) => !dto.studentId && !dto.studentCode)
    @IsEmail()
    @IsOptional()
    email?: string;

    @ValidateIf((dto: AddStudentDto) => !dto.email && !dto.studentCode)
    @IsUUID()
    @IsOptional()
    studentId?: string;

    @ValidateIf((dto: AddStudentDto) => !dto.email && !dto.studentId)
    @IsOptional()
    studentCode?: string;
}