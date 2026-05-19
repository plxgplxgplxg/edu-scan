CREATE TYPE "TestCodeResolutionStatus" AS ENUM (
  'MATCHED',
  'UNKNOWN_TEST_CODE',
  'MISSING_TEST_CODE',
  'AMBIGUOUS_TEST_CODE'
);

CREATE TABLE "ExamVariant" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "testCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExamVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AnswerKey" ADD COLUMN "variantId" TEXT;

INSERT INTO "ExamVariant" ("id", "examId", "testCode", "createdAt", "updatedAt")
SELECT e."id" || '-default', e."id", 'DEFAULT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Exam" e;

UPDATE "AnswerKey" ak
SET "variantId" = ev."id"
FROM "ExamVariant" ev
WHERE ev."examId" = ak."examId";

ALTER TABLE "Submission"
ADD COLUMN "resolvedVariantId" TEXT,
ADD COLUMN "detectedTestId" TEXT,
ADD COLUMN "resolvedTestCode" TEXT,
ADD COLUMN "testCodeResolutionStatus" "TestCodeResolutionStatus";

UPDATE "Submission"
SET
  "resolvedVariantId" = ev."id",
  "resolvedTestCode" = ev."testCode",
  "testCodeResolutionStatus" = 'MATCHED'
FROM "ExamVariant" ev
WHERE ev."examId" = "Submission"."examId";

UPDATE "Submission"
SET "testCodeResolutionStatus" = 'MISSING_TEST_CODE'
WHERE "testCodeResolutionStatus" IS NULL;

ALTER TABLE "AnswerKey" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "Submission" ALTER COLUMN "testCodeResolutionStatus" SET NOT NULL;

DROP INDEX IF EXISTS "AnswerKey_examId_questionNumber_key";
ALTER TABLE "AnswerKey" DROP COLUMN "examId";

CREATE UNIQUE INDEX "ExamVariant_examId_testCode_key" ON "ExamVariant"("examId", "testCode");
CREATE INDEX "ExamVariant_examId_idx" ON "ExamVariant"("examId");
CREATE UNIQUE INDEX "AnswerKey_variantId_questionNumber_key" ON "AnswerKey"("variantId", "questionNumber");
CREATE INDEX "Submission_resolvedVariantId_idx" ON "Submission"("resolvedVariantId");
CREATE INDEX "Submission_testCodeResolutionStatus_idx" ON "Submission"("testCodeResolutionStatus");

ALTER TABLE "ExamVariant"
ADD CONSTRAINT "ExamVariant_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnswerKey"
ADD CONSTRAINT "AnswerKey_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_resolvedVariantId_fkey"
FOREIGN KEY ("resolvedVariantId") REFERENCES "ExamVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
