-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('OMR', 'CLASS_EXAM');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'ESSAY');

-- CreateEnum
CREATE TYPE "ClassExamSubmissionStatus" AS ENUM ('PENDING_MANUAL_GRADE', 'GRADED');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN "type" "ExamType" NOT NULL DEFAULT 'OMR';

-- CreateTable
CREATE TABLE "ExamClass" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "ExamClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamClass_examId_classId_key" ON "ExamClass"("examId", "classId");

-- Backfill: copy classId from Exam to ExamClass
INSERT INTO "ExamClass" ("id", "examId", "classId")
SELECT "id" || '-class', "id", "classId" FROM "Exam";

-- AlterTable: drop old relation
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_classId_fkey";
ALTER TABLE "Exam" DROP COLUMN "classId";

-- AddForeignKey
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: exams with class links become CLASS_EXAM
UPDATE "Exam"
SET "type" = 'CLASS_EXAM'
WHERE "id" IN (SELECT DISTINCT "examId" FROM "ExamClass");

-- CreateTable
CREATE TABLE "ClassExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "answerChoice" "AnswerChoice",
    "answerText" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassExamSubmission" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ClassExamSubmissionStatus" NOT NULL DEFAULT 'PENDING_MANUAL_GRADE',
    "autoScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassExamSubmissionAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedChoice" "AnswerChoice",
    "essayAnswer" TEXT,
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassExamSubmissionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassExamQuestion_examId_orderIndex_key" ON "ClassExamQuestion"("examId", "orderIndex");

-- CreateIndex
CREATE INDEX "ClassExamQuestion_examId_idx" ON "ClassExamQuestion"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassExamSubmission_examId_studentId_key" ON "ClassExamSubmission"("examId", "studentId");

-- CreateIndex
CREATE INDEX "ClassExamSubmission_examId_studentId_idx" ON "ClassExamSubmission"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassExamSubmissionAnswer_submissionId_questionId_key" ON "ClassExamSubmissionAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "ClassExamSubmissionAnswer_questionId_idx" ON "ClassExamSubmissionAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "ClassExamQuestion" ADD CONSTRAINT "ClassExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ClassExamSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ClassExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
