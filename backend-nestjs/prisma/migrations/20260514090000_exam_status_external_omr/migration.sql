-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Exam"
ADD COLUMN "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Submission"
ADD COLUMN "studentCodeRaw" TEXT,
ADD COLUMN "matchedStudentId" TEXT,
ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false;

-- Backfill
UPDATE "Submission"
SET "studentCodeRaw" = "studentCode",
    "matchedStudentId" = "studentId",
    "isExternal" = CASE WHEN "studentId" IS NULL THEN true ELSE false END;

-- Index
CREATE INDEX "Submission_matchedStudentId_idx" ON "Submission"("matchedStudentId");
