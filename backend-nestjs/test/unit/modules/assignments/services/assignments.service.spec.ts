/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentsService } from '../../../../../src/modules/assignments/services/assignments.service';
import { AssignmentsRepository } from '../../../../../src/modules/assignments/repositories/assignments.repository';
import { PrismaService } from '../../../../../src/database/prisma.service';
import { GradeStatus, SubmitStatus } from '@prisma/client';
import { IStorageService } from '../../../../../src/storage/storage.interface';
import {
  NOTIFICATIONS_QUEUE_NAME,
  NotificationsService,
} from '../../../../../src/modules/notifications/services/notifications.service';
import { getQueueToken } from '@nestjs/bull';

const mockAssignmentsRepository = () => ({
  create: jest.fn(),
  findAllByTeacher: jest.fn(),
  findAllByStudent: jest.fn(),
  findById: jest.fn(),
  findSubmitsByAssignment: jest.fn(),
  findSubmitByStudentAndAssignment: jest.fn(),
  createSubmit: jest.fn(),
  updateSubmit: jest.fn(),
});

const mockPrismaService = () => ({
  class: {
    findFirst: jest.fn(),
  },
  classEnrollment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
});

const mockStorageService = () => ({
  uploadFile: jest.fn(),
  uploadDocument: jest.fn(),
  deleteFile: jest.fn(),
});

const mockNotificationsService = () => ({
  createAssignmentCreatedNotifications: jest.fn(),
});

const mockNotificationsQueue = () => ({
  add: jest.fn(),
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let repository: ReturnType<typeof mockAssignmentsRepository>;
  let prisma: ReturnType<typeof mockPrismaService>;
  let storageService: ReturnType<typeof mockStorageService>;
  let notificationsService: ReturnType<typeof mockNotificationsService>;

  const TEACHER_ID = 'teacher-uuid-1';
  const STUDENT_ID = 'student-uuid-1';
  const ASSIGNMENT_ID = 'assign-uuid-1';
  const SUBMIT_ID = 'submit-uuid-1';
  const CLASS_ID_1 = 'class-uuid-1';
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const mockAssignment = {
    id: ASSIGNMENT_ID,
    title: 'Weekly Assignment 1',
    description: 'Test description',
    deadline: futureDate,
    allowLate: false,
    latePenaltyPct: 0,
    maxScore: 10,
    teacherId: TEACHER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    classId: CLASS_ID_1,
    class: { id: CLASS_ID_1, name: '10A1' },
  };

  const mockSubmit = {
    id: SUBMIT_ID,
    assignmentId: ASSIGNMENT_ID,
    studentId: STUDENT_ID,
    fileUrl: 'https://cloudinary.com/file.pdf',
    submitStatus: SubmitStatus.ON_TIME,
    gradeStatus: GradeStatus.PENDING,
    score: null,
    feedback: null,
    submittedAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: AssignmentsRepository,
          useFactory: mockAssignmentsRepository,
        },
        { provide: PrismaService, useFactory: mockPrismaService },
        { provide: IStorageService, useFactory: mockStorageService },
        { provide: NotificationsService, useFactory: mockNotificationsService },
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE_NAME),
          useFactory: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    repository = module.get(AssignmentsRepository);
    prisma = module.get(PrismaService);
    storageService = module.get(IStorageService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAssignment', () => {
    const baseDto = {
      title: 'Weekly Assignment 1',
      description: 'Test description',
      deadline: futureDate.toISOString(),
      allowLate: false,
      latePenaltyPct: 0,
      maxScore: 10,
      classId: CLASS_ID_1,
    };

    it('should throw BadRequestException when deadline is in the past', async () => {
      const dto = { ...baseDto, deadline: pastDate.toISOString() };
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        'Deadline must be a future date.',
      );
    });

    it('should throw BadRequestException when latePenaltyPct exceeds 100', async () => {
      const dto = { ...baseDto, allowLate: true, latePenaltyPct: 110 };
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        'Late penalty percentage must be between 0 and 100.',
      );
    });

    it('should throw BadRequestException when latePenaltyPct is negative', async () => {
      const dto = { ...baseDto, allowLate: true, latePenaltyPct: -5 };
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        'Late penalty percentage must be between 0 and 100.',
      );
    });

    it('should throw ForbiddenException when a classId does not belong to the teacher', async () => {
      const dto = { ...baseDto, classId: 'foreign-class-id' };
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.createAssignment(TEACHER_ID, dto)).rejects.toThrow(
        'Class does not belong to this teacher.',
      );
    });

    it('should create assignment successfully with valid data', async () => {
      prisma.class.findFirst.mockResolvedValue({ id: CLASS_ID_1 });
      prisma.classEnrollment.findMany.mockResolvedValue([
        { studentId: STUDENT_ID },
      ]);
      repository.create.mockResolvedValue(mockAssignment);

      const result = await service.createAssignment(TEACHER_ID, baseDto);

      expect(prisma.class.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teacherId: TEACHER_ID, id: CLASS_ID_1 },
        }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: baseDto.title,
          deadline: expect.any(Date),
          teacherId: TEACHER_ID,
          classId: CLASS_ID_1,
        }),
      );
      expect(result).toEqual(mockAssignment);
      expect(
        notificationsService.createAssignmentCreatedNotifications,
      ).toHaveBeenCalledWith({
        assignmentId: ASSIGNMENT_ID,
        classId: CLASS_ID_1,
        title: mockAssignment.title,
        deadline: mockAssignment.deadline,
        students: [{ id: STUDENT_ID }],
      });
    });
  });

  describe('listAssignmentsForTeacher', () => {
    it('should return all assignments belonging to the teacher', async () => {
      repository.findAllByTeacher.mockResolvedValue([mockAssignment]);
      const result = await service.listAssignmentsForTeacher(TEACHER_ID);
      expect(repository.findAllByTeacher).toHaveBeenCalledWith(TEACHER_ID);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when teacher has no assignments', async () => {
      repository.findAllByTeacher.mockResolvedValue([]);
      const result = await service.listAssignmentsForTeacher(TEACHER_ID);
      expect(result).toEqual([]);
    });
  });

  describe('listAssignmentsForStudent', () => {
    it('should return all assignments available to the student', async () => {
      repository.findAllByStudent.mockResolvedValue([mockAssignment]);
      const result = await service.listAssignmentsForStudent(STUDENT_ID);
      expect(repository.findAllByStudent).toHaveBeenCalledWith(STUDENT_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe('submitAssignment', () => {
    const submitDto = { note: 'Bài làm của em' };
    const multipartFile = {
      originalname: 'essay.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('file'),
    } as Express.Multer.File;

    it('should throw NotFoundException when assignment does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow('Assignment not found.');
    });

    it('should throw ForbiddenException when student is not enrolled in the assigned class', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(
        'You are not enrolled in the class assigned to this assignment.',
      );
    });

    it('should throw BadRequestException when deadline has passed and allowLate is false', async () => {
      const overdueAssignment = {
        ...mockAssignment,
        deadline: pastDate,
        allowLate: false,
      };
      repository.findById.mockResolvedValue(overdueAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });

      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(
        'Deadline has passed and late submissions are not allowed.',
      );
    });

    it('should throw BadRequestException when submitted work can no longer be updated', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue({
        ...mockSubmit,
        gradeStatus: GradeStatus.GRADED,
      });

      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, submitDto),
      ).rejects.toThrow('This submission can no longer be updated.');
    });

    it('should create ON_TIME submit when within deadline', async () => {
      repository.findById.mockResolvedValue({
        ...mockAssignment,
        deadline: futureDate,
      });
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(null);
      repository.createSubmit.mockResolvedValue({
        ...mockSubmit,
        submitStatus: SubmitStatus.ON_TIME,
      });

      const result = await service.submitAssignment(
        ASSIGNMENT_ID,
        STUDENT_ID,
        submitDto,
      );

      expect(repository.createSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: ASSIGNMENT_ID,
          studentId: STUDENT_ID,
          note: submitDto.note,
          submitStatus: SubmitStatus.ON_TIME,
          gradeStatus: GradeStatus.PENDING,
        }),
      );
      expect(result.submitStatus).toBe(SubmitStatus.ON_TIME);
    });

    it('should create LATE submit when past deadline and allowLate is true', async () => {
      const allowLateAssignment = {
        ...mockAssignment,
        deadline: pastDate,
        allowLate: true,
      };
      repository.findById.mockResolvedValue(allowLateAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(null);
      repository.createSubmit.mockResolvedValue({
        ...mockSubmit,
        submitStatus: SubmitStatus.LATE,
      });

      const result = await service.submitAssignment(
        ASSIGNMENT_ID,
        STUDENT_ID,
        submitDto,
      );

      expect(repository.createSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ submitStatus: SubmitStatus.LATE }),
      );
      expect(result.submitStatus).toBe(SubmitStatus.LATE);
    });

    it('should upload multipart file before creating submit', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(null);
      storageService.uploadDocument.mockResolvedValue({
        url: 'https://cloudinary.com/uploaded.pdf',
        publicId: 'eduscan/assignments/uploaded.pdf',
        originalName: 'essay.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4,
        uploadedAt: expect.any(Date),
      });
      repository.createSubmit.mockResolvedValue(mockSubmit);

      await service.submitAssignment(
        ASSIGNMENT_ID,
        STUDENT_ID,
        {},
        multipartFile,
      );

      expect(storageService.uploadDocument).toHaveBeenCalledWith(
        multipartFile,
        `eduscan/assignments/${ASSIGNMENT_ID}/submissions/${STUDENT_ID}`,
      );
      expect(repository.createSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: 'https://cloudinary.com/uploaded.pdf',
          filePublicId: 'eduscan/assignments/uploaded.pdf',
          fileOriginalName: 'essay.pdf',
        }),
      );
    });

    it('should accept supported text submission file type', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(null);
      storageService.uploadDocument.mockResolvedValue({
        url: 'https://cloudinary.com/essay.txt',
        publicId: 'eduscan/assignments/essay.txt',
        originalName: 'essay.txt',
        mimeType: 'text/plain',
        sizeBytes: 4,
        uploadedAt: expect.any(Date),
      });
      repository.createSubmit.mockResolvedValue(mockSubmit);

      await service.submitAssignment(ASSIGNMENT_ID, STUDENT_ID, {}, {
        ...multipartFile,
        originalname: 'essay.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File);

      expect(storageService.uploadDocument).toHaveBeenCalled();
    });
  });

  describe('getSubmitsForTeacher', () => {
    it('should throw NotFoundException when assignment does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.getSubmitsForTeacher(ASSIGNMENT_ID, TEACHER_ID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSubmitsForTeacher(ASSIGNMENT_ID, TEACHER_ID),
      ).rejects.toThrow('Assignment not found.');
    });

    it('should throw ForbiddenException when teacher does not own the assignment', async () => {
      repository.findById.mockResolvedValue({
        ...mockAssignment,
        teacherId: 'another-teacher',
      });
      await expect(
        service.getSubmitsForTeacher(ASSIGNMENT_ID, TEACHER_ID),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getSubmitsForTeacher(ASSIGNMENT_ID, TEACHER_ID),
      ).rejects.toThrow(
        'You do not have permission to view submissions for this assignment.',
      );
    });

    it('should return submission list when teacher owns the assignment', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      repository.findSubmitsByAssignment.mockResolvedValue([mockSubmit]);

      const result = await service.getSubmitsForTeacher(
        ASSIGNMENT_ID,
        TEACHER_ID,
      );

      expect(repository.findSubmitsByAssignment).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getMySubmit', () => {
    it('should throw NotFoundException when assignment does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID),
      ).rejects.toThrow('Assignment not found.');
    });

    it('should throw ForbiddenException when student is not enrolled in the assigned class', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID),
      ).rejects.toThrow(
        'You are not enrolled in the class assigned to this assignment.',
      );
    });

    it('should return null when student has not submitted yet', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(null);

      const result = await service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID);
      expect(result).toBeNull();
    });

    it('should return submit record when found', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      prisma.classEnrollment.findFirst.mockResolvedValue({
        id: 'enrollment-1',
      });
      repository.findSubmitByStudentAndAssignment.mockResolvedValue(mockSubmit);

      const result = await service.getMySubmit(ASSIGNMENT_ID, STUDENT_ID);
      expect(result).toEqual(mockSubmit);
    });
  });

  describe('gradeSubmit', () => {
    const gradeDto = { score: 8.5, feedback: 'Good work.' };

    it('should throw NotFoundException when assignment does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, gradeDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, gradeDto),
      ).rejects.toThrow('Assignment not found.');
    });

    it('should throw ForbiddenException when teacher does not own the assignment', async () => {
      repository.findById.mockResolvedValue({
        ...mockAssignment,
        teacherId: 'another-teacher',
      });
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, gradeDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, gradeDto),
      ).rejects.toThrow(
        'You do not have permission to grade submissions for this assignment.',
      );
    });

    it('should throw BadRequestException when score exceeds maxScore', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      const dto = { score: 15, feedback: 'Too high.' };
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, dto),
      ).rejects.toThrow('Score cannot exceed the maximum score of 10.');
    });

    it('should throw BadRequestException when score is negative', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      const dto = { score: -1 };
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, dto),
      ).rejects.toThrow('Score must be a non-negative number.');
    });

    it('should grade submit successfully and set gradeStatus to GRADED', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      const gradedSubmit = {
        ...mockSubmit,
        score: 8.5,
        feedback: 'Good work.',
        gradeStatus: GradeStatus.GRADED,
      };
      repository.updateSubmit.mockResolvedValue(gradedSubmit);

      const result = await service.gradeSubmit(
        ASSIGNMENT_ID,
        SUBMIT_ID,
        TEACHER_ID,
        gradeDto,
      );

      expect(repository.updateSubmit).toHaveBeenCalledWith(
        SUBMIT_ID,
        ASSIGNMENT_ID,
        expect.objectContaining({
          score: 8.5,
          feedback: 'Good work.',
          gradeStatus: GradeStatus.GRADED,
        }),
      );
      expect(result.score).toBe(8.5);
      expect(result.gradeStatus).toBe(GradeStatus.GRADED);
    });

    it('should grade submit successfully without optional feedback', async () => {
      repository.findById.mockResolvedValue(mockAssignment);
      const gradedSubmit = {
        ...mockSubmit,
        score: 7,
        gradeStatus: GradeStatus.GRADED,
      };
      repository.updateSubmit.mockResolvedValue(gradedSubmit);

      await service.gradeSubmit(ASSIGNMENT_ID, SUBMIT_ID, TEACHER_ID, {
        score: 7,
      });

      expect(repository.updateSubmit).toHaveBeenCalledWith(
        SUBMIT_ID,
        ASSIGNMENT_ID,
        expect.objectContaining({ score: 7, gradeStatus: GradeStatus.GRADED }),
      );
    });
  });
});
