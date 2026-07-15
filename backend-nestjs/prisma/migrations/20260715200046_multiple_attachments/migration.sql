/*
  Warnings:

  - You are about to drop the column `instructionFileMimeType` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `instructionFileOriginalName` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `instructionFilePublicId` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `instructionFileSizeBytes` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `instructionFileUploadedAt` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `instructionFileUrl` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `fileMimeType` on the `AssignmentSubmit` table. All the data in the column will be lost.
  - You are about to drop the column `fileOriginalName` on the `AssignmentSubmit` table. All the data in the column will be lost.
  - You are about to drop the column `filePublicId` on the `AssignmentSubmit` table. All the data in the column will be lost.
  - You are about to drop the column `fileSizeBytes` on the `AssignmentSubmit` table. All the data in the column will be lost.
  - You are about to drop the column `fileUploadedAt` on the `AssignmentSubmit` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `AssignmentSubmit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "instructionFileMimeType",
DROP COLUMN "instructionFileOriginalName",
DROP COLUMN "instructionFilePublicId",
DROP COLUMN "instructionFileSizeBytes",
DROP COLUMN "instructionFileUploadedAt",
DROP COLUMN "instructionFileUrl",
ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "AssignmentSubmit" DROP COLUMN "fileMimeType",
DROP COLUMN "fileOriginalName",
DROP COLUMN "filePublicId",
DROP COLUMN "fileSizeBytes",
DROP COLUMN "fileUploadedAt",
DROP COLUMN "fileUrl",
ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

-- CreateIndex
CREATE INDEX "AssignmentSubmit_studentId_idx" ON "AssignmentSubmit"("studentId");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "Exam_teacherId_idx" ON "Exam"("teacherId");

-- CreateIndex
CREATE INDEX "OmrBatch_teacherId_idx" ON "OmrBatch"("teacherId");

-- CreateIndex
CREATE INDEX "OmrBatch_examId_idx" ON "OmrBatch"("examId");

-- CreateIndex
CREATE INDEX "Submission_batchId_status_idx" ON "Submission"("batchId", "status");

-- CreateIndex
CREATE INDEX "SubmissionDetail_submissionId_idx" ON "SubmissionDetail"("submissionId");
