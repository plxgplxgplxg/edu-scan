import { ApiProperty } from '@nestjs/swagger';

export class ClassTeacherResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'teacher@example.com' })
  email!: string;
}

export class ClassStudentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class ClassEnrollmentResponseDto {
  @ApiProperty({ type: ClassStudentResponseDto })
  student!: ClassStudentResponseDto;

  @ApiProperty({ type: String, format: 'date-time' })
  joinedAt!: Date;
}

export class ClassResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ example: '2025-2026' })
  schoolYear!: string;

  @ApiProperty({ example: 'EDU-ABC123' })
  code!: string;

  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ type: ClassTeacherResponseDto })
  teacher!: ClassTeacherResponseDto;

  @ApiProperty({ type: [ClassEnrollmentResponseDto] })
  enrollments!: ClassEnrollmentResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
