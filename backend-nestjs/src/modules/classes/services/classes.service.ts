import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ClassesRepository } from "../repositories/classes.repository";
import { CreateClassDto } from "../dto/request/create-class.dto";
import { UpdateClassDto } from "../dto/request/update-class.dto";
import { AddStudentDto } from "../dto/request/add-student.dto";

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

    async listTeacherClasses(teacherId: string) {
        return this.classesRepository.listTeacherClasses(teacherId);
    }

    async getTeacherClassById(classId: string, teacherId: string) {
        const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

        if (!classEntity) {
            throw new NotFoundException('Class not found!');
        }

        return classEntity;
    }

    async updateClass(classId: string, teacherId: string, updateClassDto: UpdateClassDto) {
        const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

        if (!classEntity) {
            throw new NotFoundException('Class not found!');
        }

        return this.classesRepository.updateClass(classId, teacherId, updateClassDto);
    }

    async addStudentToClass(classId: string, teacherId: string, addStudentDto: AddStudentDto) {
        const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

        if (!classEntity) {
            throw new NotFoundException('Class not found!');
        }

        if (!addStudentDto.email && !addStudentDto.studentId && !addStudentDto.studentCode) {
            throw new BadRequestException('At least one identifier (email, studentId, or studentCode) must be provided!');
        }

        const student = await this.classesRepository.findStudentForEnrollment(addStudentDto);

        if (!student) {
            throw new NotFoundException('Student not found with the provided identifier(s)!');
        }

        const existed = await this.classesRepository.enrollmentExists(classId, student.id);

        if (existed) {
            throw new BadRequestException('Student is already enrolled in this class!');
        }

        await this.classesRepository.addStudentToClass(classId, student.id);

        return this.getTeacherClassById(classId, teacherId);
    }

    async removeStudentFromClass(classId: string, studentId: string, teacherId: string) {
        const classEntity = await this.classesRepository.findTeacherClassById(classId, teacherId);

        if (!classEntity) {
            throw new NotFoundException('Class not found!');
        }

        const existed = await this.classesRepository.enrollmentExists(classId, studentId);

        if (!existed) {
            throw new BadRequestException('Student is not enrolled in this class!');
        }

        await this.classesRepository.removeStudentFromClass(classId, studentId);

        return this.getTeacherClassById(classId, teacherId);
    }

    async joinClassByCode(studentId: string, code: string) {
        const trimmedCode = code.trim().toUpperCase();
        const classEntity = await this.classesRepository.findStudentClassByCode(trimmedCode);

        if (!classEntity) {
            throw new NotFoundException('Class not found with the provided code!');
        }

        const existed = await this.classesRepository.enrollmentExists(classEntity.id, studentId);
        
        if (existed) {
            throw new BadRequestException('Student is already enrolled in this class!');
        }

        await this.classesRepository.addStudentToClass(classEntity.id, studentId);

        const enrollment = await this.classesRepository.findStudentEnrollment(classEntity.id, studentId);

        if (!enrollment) {
            throw new NotFoundException('Enrollment not found after adding student to class!');
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

        throw new BadRequestException('Failed to generate unique class code, please try again!');
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
