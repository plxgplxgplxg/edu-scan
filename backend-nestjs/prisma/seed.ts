import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Role, ExamStatus, ExamType, SubmitStatus, GradeStatus } from '@prisma/client';
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

  const class12A1 = await prisma.class.upsert({
    where: { code: 'L12A1' },
    update: { name: 'Lớp 12A1', subject: 'Toán học', schoolYear: '2025-2026', teacherId: teacher.id },
    create: { name: 'Lớp 12A1', subject: 'Toán học', schoolYear: '2025-2026', code: 'L12A1', teacherId: teacher.id }
  });
  console.log(`Seed class: ${class12A1.code}`);

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: class12A1.id, studentId: student.id } },
    update: {},
    create: { classId: class12A1.id, studentId: student.id }
  });
  console.log(`Enroll student ${student.email} into class ${class12A1.code}`);

  let exam = await prisma.exam.findFirst({
    where: { title: 'Kiểm tra giữa kỳ Toán 12', teacherId: teacher.id }
  });
  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        title: 'Kiểm tra giữa kỳ Toán 12',
        maxScore: 10.0,
        status: ExamStatus.PUBLISHED,
        type: ExamType.OMR,
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
        teacherId: teacher.id
      }
    });
  }
  console.log(`Seed assignment: ${assignment.title}`);

  await prisma.assignmentClass.upsert({
    where: { assignmentId_classId: { assignmentId: assignment.id, classId: class12A1.id } },
    update: {},
    create: { assignmentId: assignment.id, classId: class12A1.id }
  });
  console.log(`Assign assignment ${assignment.title} to class ${class12A1.code}`);

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
