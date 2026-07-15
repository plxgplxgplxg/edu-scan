import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ClassesRepository,
  ClassLightweight,
} from '../repositories/classes.repository';
import { CreateClassDto } from '../dto/request/create-class.dto';
import { UpdateClassDto } from '../dto/request/update-class.dto';
import { AddStudentDto } from '../dto/request/add-student.dto';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';

@Injectable()
export class ClassesService {
  constructor(private readonly classesRepository: ClassesRepository) {}

  async createClass(teacherId: string, createClassDto: CreateClassDto) {
    const code = await this.generateUniqueClassCode();

    return this.classesRepository.createClass({
      ...createClassDto,
      code,
      teacherId,
    });
  }

  async listTeacherClasses(
    teacherId: string,
    page = 1,
    limit = 10,
    keyword?: string,
  ) {
    const [classes, total] = await this.classesRepository.listTeacherClasses(
      teacherId,
      page,
      limit,
      keyword,
    );
    return {
      data: classes.map((item) => this.mapClassLightweightToResponse(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listClasses(
    currentUser: AuthenticatedUser,
    page = 1,
    limit = 10,
    keyword?: string,
  ) {
    let classes: ClassLightweight[] = [];
    let total = 0;
    if (currentUser.role === Role.TEACHER) {
      [classes, total] = await this.classesRepository.listTeacherClasses(
        currentUser.id,
        page,
        limit,
        keyword,
      );
    } else if (currentUser.role === Role.STUDENT) {
      [classes, total] = await this.classesRepository.listStudentClasses(
        currentUser.id,
        page,
        limit,
        keyword,
      );
    } else {
      [classes, total] = await this.classesRepository.listAllClasses(
        page,
        limit,
        keyword,
      );
    }
    return {
      data: classes.map((item) => this.mapClassLightweightToResponse(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapClassLightweightToResponse(item: ClassLightweight) {
    return {
      id: item.id,
      name: item.name,
      subject: item.subject,
      schoolYear: item.schoolYear,
      code: item.code,
      teacherId: item.teacherId,
      teacher: item.teacher,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      enrollments: Array.from(
        { length: item._count?.enrollments ?? 0 },
        () => ({
          joinedAt: new Date(),
          student: {
            id: '',
            name: '',
            email: '',
            studentCode: '',
            isActive: true,
          },
        }),
      ),
    };
  }

  async getTeacherClassById(classId: string, teacherId: string) {
    const classEntity = await this.classesRepository.findTeacherClassById(
      classId,
      teacherId,
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    return classEntity;
  }

  async getClassById(classId: string, currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.TEACHER) {
      return this.getTeacherClassById(classId, currentUser.id);
    }

    if (currentUser.role === Role.STUDENT) {
      const classEntity = await this.classesRepository.findStudentClassById(
        classId,
        currentUser.id,
      );

      if (!classEntity) {
        throw new NotFoundException('Class not found!');
      }

      return classEntity;
    }

    const classEntity = await this.classesRepository.findClassById(classId);

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    return classEntity;
  }

  async updateClass(
    classId: string,
    teacherId: string,
    updateClassDto: UpdateClassDto,
  ) {
    const classEntity = await this.classesRepository.findTeacherClassById(
      classId,
      teacherId,
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    return this.classesRepository.updateClass(
      classId,
      teacherId,
      updateClassDto,
    );
  }

  async deleteClass(classId: string, teacherId: string) {
    const classEntity = await this.classesRepository.findTeacherClassById(
      classId,
      teacherId,
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    await this.classesRepository.deleteTeacherClass(classId, teacherId);

    return { id: classId, deleted: true };
  }

  async searchAvailableStudents(
    classId: string,
    teacherId: string,
    keyword: string,
    page = 1,
    limit = 10
  ) {
    const classEntity = await this.classesRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }
    if (classEntity.teacherId !== teacherId) {
      throw new BadRequestException('Not allowed');
    }
    return this.classesRepository.searchAvailableStudents(classId, keyword, page, limit);
  }

  async addStudentToClass(
    classId: string,
    teacherId: string,
    addStudentDto: AddStudentDto,
  ) {
    const classEntity = await this.classesRepository.findTeacherClassById(
      classId,
      teacherId,
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    if (
      !addStudentDto.email &&
      !addStudentDto.studentId &&
      !addStudentDto.studentCode
    ) {
      throw new BadRequestException(
        'At least one identifier (email, studentId, or studentCode) must be provided!',
      );
    }

    const student =
      await this.classesRepository.findStudentForEnrollment(addStudentDto);

    if (!student) {
      throw new NotFoundException(
        'Student not found with the provided identifier(s)!',
      );
    }

    const existed = await this.classesRepository.enrollmentExists(
      classId,
      student.id,
    );

    if (existed) {
      throw new BadRequestException(
        'Student is already enrolled in this class!',
      );
    }

    await this.classesRepository.addStudentToClass(classId, student.id);

    return this.getTeacherClassById(classId, teacherId);
  }

  async removeStudentFromClass(
    classId: string,
    studentId: string,
    teacherId: string,
  ) {
    const classEntity = await this.classesRepository.findTeacherClassById(
      classId,
      teacherId,
    );

    if (!classEntity) {
      throw new NotFoundException('Class not found!');
    }

    const existed = await this.classesRepository.enrollmentExists(
      classId,
      studentId,
    );

    if (!existed) {
      throw new BadRequestException('Student is not enrolled in this class!');
    }

    await this.classesRepository.removeStudentFromClass(classId, studentId);

    return this.getTeacherClassById(classId, teacherId);
  }

  async joinClassByCode(studentId: string, code: string) {
    const trimmedCode = code.trim().toUpperCase();
    const classEntity =
      await this.classesRepository.findStudentClassByCode(trimmedCode);

    if (!classEntity) {
      throw new NotFoundException('Class not found with the provided code!');
    }

    const existed = await this.classesRepository.enrollmentExists(
      classEntity.id,
      studentId,
    );

    if (existed) {
      throw new BadRequestException(
        'Student is already enrolled in this class!',
      );
    }

    await this.classesRepository.addStudentToClass(classEntity.id, studentId);

    const enrollment = await this.classesRepository.findStudentEnrollment(
      classEntity.id,
      studentId,
    );

    if (!enrollment) {
      throw new NotFoundException(
        'Enrollment not found after adding student to class!',
      );
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

    throw new BadRequestException(
      'Failed to generate unique class code, please try again!',
    );
  }

  private createClassCode() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';

    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * alphabet.length);
      suffix += alphabet[randomIndex];
    }

    return `EDU-${suffix}`;
  }
}
