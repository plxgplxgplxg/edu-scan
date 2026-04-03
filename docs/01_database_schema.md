# Hướng dẫn: 1.1 Database Schema (Prisma)

---

## Kết luận nhanh

Schema cũ **chưa phù hợp hoàn toàn** với SRS và **chưa đạt 3NF sạch** ở một số điểm:

- `Exam` và `Assignment` chỉ gắn được với 1 lớp, trong khi use case yêu cầu áp dụng cho **ít nhất 1 lớp** và có thể nhiều lớp.
- `Submission.studentId` bắt buộc, nhưng UC005 cho phép không nhận diện được Student ID và tạo bài ở trạng thái `NEEDS_REVIEW`.
- Chưa có bảng riêng cho `batch_id` và tiến trình xử lý batch OMR.
- `Question.tags` là `String[]`, đây là dữ liệu đa trị trong một cột và không còn chuẩn hóa tốt.
- `RemarkRequest` chứa cả `submissionId` lẫn `submissionDetailId`, trong đó `submissionId` là dư thừa.
- `SubmissionDetail.correctAnswer` và `isCorrect` là dữ liệu dẫn xuất/dư thừa so với `AnswerKey`.

Schema mới bên dưới sửa các điểm đó theo hướng:

- Ưu tiên bám SRS
- Đạt 3NF thực dụng
- Giữ phù hợp với Prisma và roadmap hiện tại

---

## File chính

| File | Vị trí |
|---|---|
| `schema.prisma` | `backend-nestjs/prisma/schema.prisma` |

---

## Schema chuẩn hóa đề xuất

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
}

enum AnswerChoice {
  A
  B
  C
  D
}

enum SubmissionStatus {
  GRADED
  NEEDS_REVIEW
  FAILED
}

enum OmrBatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  PARTIAL_FAILED
  FAILED
}

enum SubmitStatus {
  ON_TIME
  LATE
}

enum GradeStatus {
  PENDING
  GRADED
}

enum RemarkStatus {
  PENDING
  APPROVED
  REJECTED
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  studentCode  String?  @unique
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  taughtClasses     Class[]            @relation("TeacherClasses")
  classEnrollments  ClassEnrollment[]
  submissions       Submission[]       @relation("StudentSubmissions")
  assignmentSubmits AssignmentSubmit[]
  remarkRequests    RemarkRequest[]    @relation("StudentRemarkRequests")
  reviewedRemarks   RemarkRequest[]    @relation("TeacherReviewedRemarks")
  questions         Question[]
  exams             Exam[]             @relation("TeacherExams")
  assignments       Assignment[]       @relation("TeacherAssignments")
  omrBatches        OmrBatch[]         @relation("TeacherOmrBatches")
}

model Class {
  id         String   @id @default(uuid())
  name       String
  subject    String
  schoolYear String
  code       String   @unique
  teacherId  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  teacher         User               @relation("TeacherClasses", fields: [teacherId], references: [id])
  enrollments     ClassEnrollment[]
  examAssignments ExamClass[]
  assignments     AssignmentClass[]
}

model ClassEnrollment {
  id        String   @id @default(uuid())
  classId   String
  studentId String
  joinedAt  DateTime @default(now())

  class   Class @relation(fields: [classId], references: [id], onDelete: Cascade)
  student User  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([classId, studentId])
}

model Exam {
  id         String   @id @default(uuid())
  title      String
  maxScore   Float
  teacherId  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  teacher     User         @relation("TeacherExams", fields: [teacherId], references: [id])
  answerKeys  AnswerKey[]
  questionMap ExamQuestion[]
  classes     ExamClass[]
  submissions Submission[]
  omrBatches  OmrBatch[]
}

model ExamClass {
  id      String @id @default(uuid())
  examId  String
  classId String

  exam  Exam  @relation(fields: [examId], references: [id], onDelete: Cascade)
  class Class @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@unique([examId, classId])
}

model AnswerKey {
  id             String       @id @default(uuid())
  examId         String
  questionNumber Int
  correctAnswer  AnswerChoice

  exam Exam @relation(fields: [examId], references: [id], onDelete: Cascade)

  @@unique([examId, questionNumber])
}

model ExamQuestion {
  id             String  @id @default(uuid())
  examId         String
  questionNumber Int
  questionId     String?

  exam     Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)
  question Question? @relation(fields: [questionId], references: [id], onDelete: SetNull)

  @@unique([examId, questionNumber])
  @@unique([examId, questionId])
}

model OmrBatch {
  id             String         @id @default(uuid())
  examId         String
  teacherId      String
  status         OmrBatchStatus @default(PENDING)
  totalFiles     Int
  processedFiles Int            @default(0)
  successCount   Int            @default(0)
  failedCount    Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  completedAt    DateTime?

  exam        Exam         @relation(fields: [examId], references: [id], onDelete: Cascade)
  teacher     User         @relation("TeacherOmrBatches", fields: [teacherId], references: [id])
  submissions Submission[]
}

model Submission {
  id          String           @id @default(uuid())
  examId      String
  studentId   String?
  batchId     String?
  studentCode String?
  imageUrl    String?
  status      SubmissionStatus @default(NEEDS_REVIEW)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  reviewedAt  DateTime?

  exam    Exam               @relation(fields: [examId], references: [id], onDelete: Cascade)
  student User?              @relation("StudentSubmissions", fields: [studentId], references: [id], onDelete: SetNull)
  batch   OmrBatch?          @relation(fields: [batchId], references: [id], onDelete: SetNull)
  details SubmissionDetail[]

  @@index([examId, studentId])
  @@index([batchId])
  @@index([studentCode])
}

model SubmissionDetail {
  id             String        @id @default(uuid())
  submissionId   String
  questionNumber Int
  detectedAnswer AnswerChoice?
  finalAnswer    AnswerChoice?
  needsReview    Boolean       @default(false)

  submission Submission      @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  remarks    RemarkRequest[]

  @@unique([submissionId, questionNumber])
}

model Assignment {
  id             String   @id @default(uuid())
  title          String
  description    String?
  deadline       DateTime
  allowLate      Boolean  @default(false)
  latePenaltyPct Float    @default(0)
  maxScore       Float    @default(10)
  teacherId      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  teacher User              @relation("TeacherAssignments", fields: [teacherId], references: [id])
  classes AssignmentClass[]
  submits AssignmentSubmit[]
}

model AssignmentClass {
  id           String @id @default(uuid())
  assignmentId String
  classId      String

  assignment Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  class      Class      @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@unique([assignmentId, classId])
}

model AssignmentSubmit {
  id           String      @id @default(uuid())
  assignmentId String
  studentId    String
  fileUrl      String
  submitStatus SubmitStatus
  gradeStatus  GradeStatus @default(PENDING)
  score        Float?
  feedback     String?
  submittedAt  DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  assignment Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  student    User       @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([assignmentId, studentId])
}

model RemarkRequest {
  id                 String       @id @default(uuid())
  submissionDetailId String
  studentId          String
  reviewerId         String?
  reason             String
  status             RemarkStatus @default(PENDING)
  teacherComment     String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  reviewedAt         DateTime?

  submissionDetail SubmissionDetail @relation(fields: [submissionDetailId], references: [id], onDelete: Cascade)
  student          User             @relation("StudentRemarkRequests", fields: [studentId], references: [id], onDelete: Cascade)
  reviewer         User?            @relation("TeacherReviewedRemarks", fields: [reviewerId], references: [id], onDelete: SetNull)

  @@unique([submissionDetailId, studentId])
}

model Question {
  id            String       @id @default(uuid())
  content       String
  optionA       String
  optionB       String
  optionC       String
  optionD       String
  correctAnswer AnswerChoice
  subject       String
  difficulty    Difficulty
  teacherId     String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  teacher     User         @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  tags        QuestionTag[]
  examEntries ExamQuestion[]
}

model Tag {
  id        String       @id @default(uuid())
  name      String       @unique
  questions QuestionTag[]
}

model QuestionTag {
  questionId String
  tagId      String

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  tag      Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([questionId, tagId])
}
```

---

## Vì sao schema này bám đúng SRS hơn

### UC003 Quản lý lớp học

- `Class` + `ClassEnrollment` hỗ trợ giáo viên tạo lớp, thêm/xóa học sinh, học sinh join bằng mã lớp.

### UC004 Tạo đề thi

- `ExamClass` cho phép một đề thi gán cho nhiều lớp.
- `AnswerKey` lưu đáp án chuẩn theo từng câu.
- `ExamQuestion` cho phép liên kết đề thi với câu hỏi từ ngân hàng câu hỏi khi cần.

### UC005 OMR Batch

- `OmrBatch` lưu `batch_id`, trạng thái, số lượng file, tiến độ và kết quả tổng hợp.
- `Submission.studentId` là nullable để hỗ trợ trường hợp không match được học sinh.
- `Submission.studentCode` lưu mã học sinh đọc được từ phiếu để giáo viên ghép tay nếu cần.

### UC006 Manual Override

- `SubmissionDetail.detectedAnswer` giữ kết quả OMR ban đầu.
- `SubmissionDetail.finalAnswer` giữ đáp án cuối cùng sau khi giáo viên sửa.

### UC007 và UC008 Bài tập

- `AssignmentClass` cho phép giao một bài tập cho nhiều lớp.
- `AssignmentSubmit` quản lý một bài nộp trên mỗi học sinh cho mỗi bài tập.

### UC010 Phúc khảo

- `RemarkRequest` gắn với đúng `SubmissionDetail`.
- `reviewerId`, `teacherComment`, `reviewedAt` hỗ trợ quy trình duyệt của giáo viên.

### UC011 Ngân hàng câu hỏi

- `Tag` + `QuestionTag` chuẩn hóa tags thay cho `String[]`.

---

## Vì sao schema này gần chuẩn 3NF hơn

Các điểm đã sửa để tránh lệch chuẩn hóa:

- Bỏ `Question.tags: String[]`
  - Thay bằng `Tag` và `QuestionTag`
  - Tránh dữ liệu đa trị trong một cột

- Bỏ `RemarkRequest.submissionId`
  - Vì đã suy ra được từ `submissionDetailId`
  - Tránh phụ thuộc bắc cầu

- Bỏ `SubmissionDetail.correctAnswer` và `isCorrect`
  - Đây là dữ liệu suy ra từ `AnswerKey` và `finalAnswer`
  - Tránh lưu dư thừa, tránh mất đồng bộ

- Bỏ `Exam.classId`
  - Thay bằng `ExamClass`
  - Phù hợp quan hệ nhiều-nhiều theo use case

- Bỏ `Assignment.classId`
  - Thay bằng `AssignmentClass`
  - Phù hợp use case giao bài cho nhiều lớp

---

## Ghi chú thực dụng

Schema này hướng tới 3NF, nhưng vẫn giữ vài lựa chọn thực dụng:

- `Submission.studentCode` vẫn được giữ vì đây là dữ liệu đầu vào nhận diện từ phiếu, không hoàn toàn đồng nhất với `User.studentCode` nếu hệ thống đọc sai hoặc chưa ghép được học sinh.
- `Question.optionA` đến `optionD` giữ dạng cột cố định vì miền đáp án là hữu hạn và ổn định; không cần tách thành bảng option nếu không có nhu cầu động.

---

## Việc cần làm sau khi sửa schema

```bash
cd backend-nestjs
npx prisma format
npx prisma validate
npx prisma migrate dev --name normalize_schema_for_srs
```

Lưu ý:
- Repo này đang dùng Prisma 7 với [prisma.config.ts](/Users/plxg/workspace/edu-scan/backend-nestjs/prisma.config.ts), nên `datasource.url` không đặt trong `schema.prisma`.
- `DATABASE_URL` được đọc từ `prisma.config.ts`.

Nếu đang có code cũ dùng các field sau, cần sửa service/repository tương ứng:

- `Exam.classId`
- `Assignment.classId`
- `Submission.totalScore`
- `SubmissionDetail.correctAnswer`
- `SubmissionDetail.isCorrect`
- `Question.tags`
- `RemarkRequest.submissionId`
