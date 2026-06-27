-- Add grading score fields to Submission
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "maxScore" DOUBLE PRECISION;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "correctCount" INTEGER;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "wrongCount" INTEGER;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Submission_examId_score_idx" ON "Submission"("examId", "score");

-- Add grading fields back to SubmissionDetail
ALTER TABLE "SubmissionDetail" ADD COLUMN IF NOT EXISTS "correctAnswer" "AnswerChoice";
ALTER TABLE "SubmissionDetail" ADD COLUMN IF NOT EXISTS "isCorrect" BOOLEAN;
