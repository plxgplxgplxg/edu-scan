/*
  Warnings:

  - You are about to drop the column `correctAnswer` on the `SubmissionDetail` table. All the data in the column will be lost.
  - You are about to drop the column `isCorrect` on the `SubmissionDetail` table. All the data in the column will be lost.
  - You are about to drop the column `studentAnswer` on the `SubmissionDetail` table. All the data in the column will be lost.
  - Changed the type of `correctAnswer` on the `AnswerKey` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `correctAnswer` on the `Question` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Submission_matchedStudentId_idx";

-- AlterTable
ALTER TABLE "AnswerKey" DROP COLUMN "correctAnswer",
ADD COLUMN     "correctAnswer" "AnswerChoice" NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "correctAnswer",
ADD COLUMN     "correctAnswer" "AnswerChoice" NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubmissionDetail" DROP COLUMN "correctAnswer",
DROP COLUMN "isCorrect",
DROP COLUMN "studentAnswer",
ADD COLUMN     "detectedAnswer" TEXT,
ADD COLUMN     "finalAnswer" "AnswerChoice";
