import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from '../../../../../src/modules/assignments/controllers/assignments.controller';
import { AssignmentsService } from '../../../../../src/modules/assignments/services/assignments.service';
import { Role, GradeStatus, SubmitStatus } from '@prisma/client';

const mockAssignmentsService = () => ({
  createAssignment: jest.fn(),
  listAssignmentsForTeacher: jest.fn(),
  listAssignmentsForStudent: jest.fn(),
  submitAssignment: jest.fn(),
  getSubmitsForTeacher: jest.fn(),
  getMySubmit: jest.fn(),
  gradeSubmit: jest.fn(),
});

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let service: ReturnType<typeof mockAssignmentsService>;

  const TEACHER_ID = 'teacher-uuid-1';
  const STUDENT_ID = 'student-uuid-1';
  const ASSIGNMENT_ID = 'assign-uuid-1';
  const SUBMIT_ID = 'submit-uuid-1';

  const mockTeacherReq = { user: { id: TEACHER_ID, role: Role.TEACHER } };
  const mockStudentReq = { user: { id: STUDENT_ID, role: Role.STUDENT } };

  const mockAssignment = {
    id: ASSIGNMENT_ID,
    title: 'Weekly Assignment 1',
    teacherId: TEACHER_ID,
  };

  const mockSubmit = {
    id: SUBMIT_ID,
    assignmentId: ASSIGNMENT_ID,
    studentId: STUDENT_ID,
    submitStatus: SubmitStatus.ON_TIME,
    gradeStatus: GradeStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        { provide: AssignmentsService, useFactory: mockAssignmentsService },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    service = module.get(AssignmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /assignments (createAssignment)', () => {
    it('should call service.createAssignment with teacherId from request', async () => {
      const dto = {
        title: 'Weekly Assignment 1',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        classIds: ['class-1'],
        allowLate: false,
        latePenaltyPct: 0,
        maxScore: 10,
      };
      service.createAssignment.mockResolvedValue(mockAssignment);

      const result = await controller.create(dto, mockTeacherReq);

      expect(service.createAssignment).toHaveBeenCalledWith(TEACHER_ID, dto);
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('GET /assignments (listAssignments)', () => {
    it('should call listAssignmentsForTeacher when user is TEACHER', async () => {
      service.listAssignmentsForTeacher.mockResolvedValue([mockAssignment]);

      const result = await controller.findAll(mockTeacherReq);

      expect(service.listAssignmentsForTeacher).toHaveBeenCalledWith(
        TEACHER_ID,
      );
      expect(service.listAssignmentsForStudent).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should call listAssignmentsForStudent when user is STUDENT', async () => {
      service.listAssignmentsForStudent.mockResolvedValue([mockAssignment]);

      const result = await controller.findAll(mockStudentReq);

      expect(service.listAssignmentsForStudent).toHaveBeenCalledWith(
        STUDENT_ID,
      );
      expect(service.listAssignmentsForTeacher).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('GET /assignments/:id/submits (getSubmitsForTeacher)', () => {
    it('should call service.getSubmitsForTeacher with correct params', async () => {
      service.getSubmitsForTeacher.mockResolvedValue([mockSubmit]);

      const result = await controller.getSubmits(ASSIGNMENT_ID, mockTeacherReq);

      expect(service.getSubmitsForTeacher).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        TEACHER_ID,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('POST /assignments/:id/submits (submitAssignment)', () => {
    it('should call service.submitAssignment with studentId from request', async () => {
      const dto = { fileUrl: 'https://cloudinary.com/file.pdf' };
      service.submitAssignment.mockResolvedValue(mockSubmit);

      const result = await controller.submit(
        ASSIGNMENT_ID,
        dto,
        mockStudentReq,
      );

      expect(service.submitAssignment).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        STUDENT_ID,
        dto,
      );
      expect(result).toEqual(mockSubmit);
    });
  });

  describe('GET /assignments/:id/submits/me (getMySubmit)', () => {
    it('should call service.getMySubmit with studentId from request', async () => {
      service.getMySubmit.mockResolvedValue(mockSubmit);

      const result = await controller.getMySubmit(
        ASSIGNMENT_ID,
        mockStudentReq,
      );

      expect(service.getMySubmit).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        STUDENT_ID,
      );
      expect(result).toEqual(mockSubmit);
    });
  });

  describe('PATCH /assignments/:id/submits/:submitId/grade (gradeSubmit)', () => {
    it('should call service.gradeSubmit with correct params', async () => {
      const dto = { score: 8.5, feedback: 'Good work.' };
      const gradedSubmit = {
        ...mockSubmit,
        score: 8.5,
        gradeStatus: GradeStatus.GRADED,
      };
      service.gradeSubmit.mockResolvedValue(gradedSubmit);

      const result = await controller.grade(
        ASSIGNMENT_ID,
        SUBMIT_ID,
        dto,
        mockTeacherReq,
      );

      expect(service.gradeSubmit).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        SUBMIT_ID,
        TEACHER_ID,
        dto,
      );
      expect(result.score).toBe(8.5);
    });
  });
});
