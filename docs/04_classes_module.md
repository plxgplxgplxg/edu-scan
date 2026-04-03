# Hướng dẫn: 2.1 UC003 - Classes Module

> Nhiệm vụ: Xây dựng module quản lý lớp học cho giáo viên, hỗ trợ tạo lớp, cập nhật lớp, thêm/xóa học sinh và học sinh join bằng mã lớp.

**Bạn vui lòng tạo các file sau đúng theo cấu trúc và copy nguyên code vào.**

---

## 1. DTOs

**File: `backend-nestjs/src/modules/classes/dto/create-class.dto.ts`**
```typescript
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
```

**File: `backend-nestjs/src/modules/classes/dto/update-class.dto.ts`**
```typescript
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subject?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'schoolYear must match YYYY-YYYY format',
  })
  schoolYear?: string;
}
```

**File: `backend-nestjs/src/modules/classes/dto/add-student.dto.ts`**
```typescript
import { IsEmail, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

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
  @IsString()
  @IsOptional()
  studentCode?: string;
}
```

---

## 2. Repository

**File: `backend-nestjs/src/modules/classes/repositories/classes.repository.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const classDetailInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
    },1
  },
  enrollments: {
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentCode: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  },
} satisfies Prisma.ClassInclude;

@Injectable()
export class ClassesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createClass(data: {
    name: string;
    subject: string;
    schoolYear: string;
    code: string;
    teacherId: string;
  }) {
    return this.prismaService.class.create({
      data,
      include: classDetailInclude,
    });
  }

  async listTeacherClasses(teacherId: string) {
    return this.prismaService.class.findMany({
      where: { teacherId },
      include: classDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTeacherClassById(classId: string, teacherId: string) {
    return this.prismaService.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
      include: classDetailInclude,
    });
  }

  async findStudentClassByCode(code: string) {
    return this.prismaService.class.findUnique({
      where: { code },
      include: classDetailInclude,
    });
  }

  async updateClass(
    classId: string,
    teacherId: string,
    data: Prisma.ClassUpdateInput,
  ) {
    return this.prismaService.class.update({
      where: { id: classId, teacherId },
      data,
      include: classDetailInclude,
    });
  }

  async classCodeExists(code: string) {
    const existing = await this.prismaService.class.findUnique({
      where: { code },
      select: { id: true },
    });

    return !!existing;
  }

  async findStudentForEnrollment(identifier: {
    email?: string;
    studentId?: string;
    studentCode?: string;
  }) {
    const orConditions = [
      identifier.email ? { email: identifier.email } : null,
      identifier.studentId ? { id: identifier.studentId } : null,
      identifier.studentCode ? { studentCode: identifier.studentCode } : null,
    ].filter(Boolean) as Prisma.UserWhereInput[];

    return this.prismaService.user.findFirst({
      where: {
        role: Role.STUDENT,
        isActive: true,
        OR: orConditions,
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentCode: true,
      },
    });
  }

  async enrollmentExists(classId: string, studentId: string) {
    const enrollment = await this.prismaService.classEnrollment.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
      select: { id: true },
    });

    return !!enrollment;
  }

  async addStudentToClass(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.create({
      data: {
        classId,
        studentId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentCode: true,
          },
        },
      },
    });
  }

  async removeStudentFromClass(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.delete({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });
  }

  async findStudentEnrollment(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
      include: {
        class: {
          include: classDetailInclude,
        },
      },
    });
  }
}
```

---

## 3. Service

**File: `backend-nestjs/src/modules/classes/services/classes.service.ts`**
```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddStudentDto } from '../dto/add-student.dto';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { ClassesRepository } from '../repositories/classes.repository';

@Injectable()
export class ClassesService {
  constructor(private readonly classesRepository: ClassesRepository) {}

  async createClass(teacherId: string, createClassDto: CreateClassDto) {
    const code = await this.generateUniqueClassCode();

    return this.classesRepository.createClass({
      ...createClassDto,
      teacherId,
      code,
    });
  }

  async listTeacherClasses(teacherId: string) {
    return this.classesRepository.listTeacherClasses(teacherId);
  }

  async getTeacherClassById(classId: string, teacherId: string) {
    const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async updateClass(classId: string, teacherId: string, updateClassDto: UpdateClassDto) {
    const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return this.classesRepository.updateClass(classId, teacherId, updateClassDto);
  }

  async addStudentToClass(classId: string, teacherId: string, addStudentDto: AddStudentDto) {
    const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    if (!addStudentDto.email && !addStudentDto.studentId && !addStudentDto.studentCode) {
      throw new BadRequestException('email, studentId, or studentCode is required');
    }

    const student = await this.classesRepository.findStudentForEnrollment(addStudentDto);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existed = await this.classesRepository.enrollmentExists(classId, student.id);

    if (existed) {
      throw new BadRequestException('Student is already in this class');
    }

    await this.classesRepository.addStudentToClass(classId, student.id);

    return this.getTeacherClassById(classId, teacherId);
  }

  async removeStudentFromClass(classId: string, studentId: string, teacherId: string) {
    const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const existed = await this.classesRepository.enrollmentExists(classId, studentId);

    if (!existed) {
      throw new NotFoundException('Student is not in this class');
    }

    await this.classesRepository.removeStudentFromClass(classId, studentId);

    return this.getTeacherClassById(classId, teacherId);
  }

  async joinClassByCode(studentId: string, code: string) {
    const trimmedCode = code.trim().toUpperCase();
    const classEntity = await this.classesRepository.findStudentClassByCode(trimmedCode);

    if (!classEntity) {
      throw new NotFoundException('Class code is invalid');
    }

    const existed = await this.classesRepository.enrollmentExists(classEntity.id, studentId);

    if (existed) {
      throw new BadRequestException('You have already joined this class');
    }

    await this.classesRepository.addStudentToClass(classEntity.id, studentId);

    const enrollment = await this.classesRepository.findStudentEnrollment(classEntity.id, studentId);

    if (!enrollment) {
      throw new NotFoundException('Enrollment was not created');
    }

    return enrollment.class;
  }

  private async generateUniqueClassCode() {
    for (let index = 0; index < 20; index += 1) {
      const candidate = this.createClassCode();
      const existed = await this.classesRepository.classCodeExists(candidate);

      if (!existed) {
        return candidate;
      }
    }

    throw new BadRequestException('Unable to generate unique class code');
  }

  private createClassCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';

    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      suffix += alphabet[randomIndex];
    }

    return `EDU-${suffix}`;
  }
}
```

---

## 4. Controller

**File: `backend-nestjs/src/modules/classes/controllers/classes.controller.ts`**
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { AddStudentDto } from '../dto/add-student.dto';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { ClassesService } from '../services/classes.service';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.TEACHER)
  async createClass(
    @CurrentUser('id') teacherId: string,
    @Body() createClassDto: CreateClassDto,
  ) {
    return this.classesService.createClass(teacherId, createClassDto);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  async getMyClasses(@CurrentUser('id') teacherId: string) {
    return this.classesService.listTeacherClasses(teacherId);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  async getClassById(
    @Param('id') classId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.classesService.getTeacherClassById(classId, teacherId);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  async updateClass(
    @Param('id') classId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(classId, teacherId, updateClassDto);
  }

  @Post(':id/students')
  @Roles(Role.TEACHER)
  async addStudentToClass(
    @Param('id') classId: string,
    @CurrentUser('id') teacherId: string,
    @Body() addStudentDto: AddStudentDto,
  ) {
    return this.classesService.addStudentToClass(classId, teacherId, addStudentDto);
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.TEACHER)
  async removeStudentFromClass(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.classesService.removeStudentFromClass(classId, studentId, teacherId);
  }

  @Post('join/:code')
  @Roles(Role.STUDENT)
  async joinClassByCode(
    @Param('code') code: string,
    @CurrentUser('id') studentId: string,
  ) {
    return this.classesService.joinClassByCode(studentId, code);
  }
}
```

---

## 5. Module

**File: `backend-nestjs/src/modules/classes/classes.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ClassesController } from './controllers/classes.controller';
import { ClassesRepository } from './repositories/classes.repository';
import { ClassesService } from './services/classes.service';

@Module({
  controllers: [ClassesController],
  providers: [ClassesRepository, ClassesService],
  exports: [ClassesRepository, ClassesService],
})
export class ClassesModule {}
```

---

## 6. Cập nhật `app.module.ts`

**File: `backend-nestjs/src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import cloudinaryConfig from './config/cloudinary.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cloudinaryConfig, redisConfig],
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 7. Ghi chú thiết kế

- `ClassesRepository` chỉ tập trung vào data access.
- `ClassesService` giữ business rules: sinh mã lớp, kiểm tra quyền sở hữu lớp, tránh enroll trùng, join bằng code.
- Controller chỉ làm nhiệm vụ điều phối HTTP và guard.
- Không tạo `entity` riêng vì Prisma schema đã là data model chính.
- `ExamClass` và `AssignmentClass` trong schema mới không bị ràng buộc bởi module lớp, nên module này chỉ quản lý `Class` và `ClassEnrollment`.
- `studentCode` được hỗ trợ sẵn trong `AddStudentDto` để phù hợp flow OMR/manual match về sau.
