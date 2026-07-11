import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Role, ExamStatus, SubmitStatus, GradeStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function seedUser(email: string, name: string, role: Role, password: string, studentCode?: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, studentCode },
    create: { email, name, role, passwordHash, studentCode }
  });
  console.log(`Seed user [${role}]: ${email}`);
  return user;
}

async function main() {
  const admin = await seedUser('admin@eduscan.vn', 'Quản trị viên', Role.ADMIN, 'Admin@1234');
  const teacher = await seedUser('teacher@eduscan.vn', 'Giáo viên Mẫu', Role.TEACHER, 'Teacher@1234');
  const student = await seedUser('student@eduscan.vn', 'Học sinh Mẫu', Role.STUDENT, 'Student@1234', '20224871');

  const additionalStudents = await Promise.all([
    seedUser('student.nguyenminhan@eduscan.vn', 'Nguyễn Minh Anh', Role.STUDENT, 'Student@1234', '20250001'),
    seedUser('student.tranbaolong@eduscan.vn', 'Trần Bảo Long', Role.STUDENT, 'Student@1234', '20250002'),
    seedUser('student.lethuyduong@eduscan.vn', 'Lê Thùy Dương', Role.STUDENT, 'Student@1234', '20250003'),
    seedUser('student.phamquanghuy@eduscan.vn', 'Phạm Quang Huy', Role.STUDENT, 'Student@1234', '20250004'),
    seedUser('student.vothanhha@eduscan.vn', 'Võ Thanh Hà', Role.STUDENT, 'Student@1234', '20250005'),
  ]);

  const classDefinitions = [
    { code: 'L12A1', name: 'Lớp 12A1', subject: 'Toán học' },
    { code: 'L12A2', name: 'Lớp 12A2', subject: 'Vật lý' },
    { code: 'L12A3', name: 'Lớp 12A3', subject: 'Hóa học' },
    { code: 'L12A4', name: 'Lớp 12A4', subject: 'Ngữ văn' },
    { code: 'L12A5', name: 'Lớp 12A5', subject: 'Tiếng Anh' },
    { code: 'L11A1', name: 'Lớp 11A1', subject: 'Toán học' },
    { code: 'L11A2', name: 'Lớp 11A2', subject: 'Vật lý' },
    { code: 'L11A3', name: 'Lớp 11A3', subject: 'Hóa học' },
    { code: 'L10A1', name: 'Lớp 10A1', subject: 'Toán học' },
    { code: 'L10A2', name: 'Lớp 10A2', subject: 'Tiếng Anh' },
  ];

  const seededClasses = await Promise.all(classDefinitions.map(async (classDefinition) => {
    const seededClass = await prisma.class.upsert({
      where: { code: classDefinition.code },
      update: { ...classDefinition, schoolYear: '2025-2026', teacherId: teacher.id },
      create: { ...classDefinition, schoolYear: '2025-2026', teacherId: teacher.id },
    });
    console.log(`Seed class: ${seededClass.code}`);
    return seededClass;
  }));
  const classByCode = new Map(seededClasses.map((seededClass) => [seededClass.code, seededClass]));
  const class12A1 = classByCode.get('L12A1');
  if (!class12A1) {
    throw new Error('Seed class L12A1 was not created');
  }

  const enrollments = [
    { classCode: 'L12A1', studentId: student.id },
    { classCode: 'L12A1', studentId: additionalStudents[0].id },
    { classCode: 'L12A2', studentId: additionalStudents[0].id },
    { classCode: 'L12A3', studentId: additionalStudents[1].id },
    { classCode: 'L12A4', studentId: additionalStudents[1].id },
    { classCode: 'L12A5', studentId: additionalStudents[2].id },
    { classCode: 'L11A1', studentId: additionalStudents[2].id },
    { classCode: 'L11A2', studentId: additionalStudents[3].id },
    { classCode: 'L11A3', studentId: additionalStudents[3].id },
    { classCode: 'L10A1', studentId: additionalStudents[4].id },
    { classCode: 'L10A2', studentId: additionalStudents[4].id },
  ];
  for (const enrollment of enrollments) {
    const seededClass = classByCode.get(enrollment.classCode);
    if (!seededClass) {
      throw new Error(`Seed class ${enrollment.classCode} was not created`);
    }
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: seededClass.id, studentId: enrollment.studentId } },
      update: {},
      create: { classId: seededClass.id, studentId: enrollment.studentId },
    });
    console.log(`Enroll student ${enrollment.studentId} into class ${seededClass.code}`);
  }

  let exam = await prisma.exam.findFirst({
    where: { title: 'Kiểm tra giữa kỳ Toán 12', teacherId: teacher.id }
  });
  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        title: 'Kiểm tra giữa kỳ Toán 12',
        maxScore: 10.0,
        status: ExamStatus.PUBLISHED,
        teacherId: teacher.id
      }
    });
  }
  console.log(`Seed exam: ${exam.title}`);

  await prisma.examClass.upsert({
    where: { examId_classId: { examId: exam.id, classId: class12A1.id } },
    update: {},
    create: { examId: exam.id, classId: class12A1.id }
  });
  console.log(`Assign exam ${exam.title} to class ${class12A1.code}`);

  const variant101 = await prisma.examVariant.upsert({
    where: { examId_testCode: { examId: exam.id, testCode: '101' } },
    update: {},
    create: { examId: exam.id, testCode: '101' }
  });
  console.log(`Seed exam variant: ${variant101.testCode}`);

  const answers = [
    { questionNumber: 1, correctAnswer: 'A' },
    { questionNumber: 2, correctAnswer: 'B' },
    { questionNumber: 3, correctAnswer: 'C' },
    { questionNumber: 4, correctAnswer: 'D' },
    { questionNumber: 5, correctAnswer: 'A' },
    { questionNumber: 6, correctAnswer: 'B' },
    { questionNumber: 7, correctAnswer: 'C' },
    { questionNumber: 8, correctAnswer: 'D' },
    { questionNumber: 9, correctAnswer: 'A' },
    { questionNumber: 10, correctAnswer: 'B' },
  ];
  for (const ans of answers) {
    await prisma.answerKey.upsert({
      where: { variantId_questionNumber: { variantId: variant101.id, questionNumber: ans.questionNumber } },
      update: { correctAnswer: ans.correctAnswer as any },
      create: { variantId: variant101.id, questionNumber: ans.questionNumber, correctAnswer: ans.correctAnswer as any }
    });
  }
  console.log(`Seed answers for variant ${variant101.testCode}`);

  let assignment = await prisma.assignment.findFirst({
    where: { title: 'Bài tập Đạo hàm và Khảo sát đồ thị', teacherId: teacher.id }
  });
  if (!assignment) {
    assignment = await prisma.assignment.create({
      data: {
        title: 'Bài tập Đạo hàm và Khảo sát đồ thị',
        description: 'Hoàn thành các bài tập khảo sát hàm số trong sách giáo khoa.',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxScore: 10.0,
        teacherId: teacher.id,
        classId: class12A1.id
      }
    });
  }
  console.log(`Seed assignment: ${assignment.title}`);



  await prisma.assignmentSubmit.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    update: { score: 9.0, feedback: 'Làm bài tốt, trình bày sạch sẽ.' },
    create: {
      assignmentId: assignment.id,
      studentId: student.id,
      fileUrl: 'https://cloudinary.com/mock-assignment.pdf',
      submitStatus: SubmitStatus.ON_TIME,
      gradeStatus: GradeStatus.GRADED,
      score: 9.0,
      feedback: 'Làm bài tốt, trình bày sạch sẽ.'
    }
  });
  console.log(`Seed student submission for assignment ${assignment.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
