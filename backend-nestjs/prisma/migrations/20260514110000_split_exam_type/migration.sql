DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnswerChoice') THEN
        CREATE TYPE "AnswerChoice" AS ENUM ('A', 'B', 'C', 'D');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamType') THEN
        CREATE TYPE "ExamType" AS ENUM ('OMR', 'CLASS_EXAM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuestionType') THEN
        CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'ESSAY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassExamSubmissionStatus') THEN
        CREATE TYPE "ClassExamSubmissionStatus" AS ENUM ('PENDING_MANUAL_GRADE', 'GRADED');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Exam' AND column_name='type') THEN
        ALTER TABLE "Exam" ADD COLUMN "type" "ExamType" NOT NULL DEFAULT 'OMR';
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS "ExamClass" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "ExamClass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExamClass_examId_classId_key" ON "ExamClass"("examId", "classId");

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Exam' AND column_name='classId') THEN
        INSERT INTO "ExamClass" ("id", "examId", "classId")
        SELECT "id" || '-class', "id", "classId" FROM "Exam"
        ON CONFLICT ("examId", "classId") DO NOTHING;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='Exam_classId_fkey') THEN
        ALTER TABLE "Exam" DROP CONSTRAINT "Exam_classId_fkey";
    END IF;
END$$;

ALTER TABLE "Exam" DROP COLUMN IF EXISTS "classId";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ExamClass_examId_fkey') THEN
        ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ExamClass_classId_fkey') THEN
        ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

UPDATE "Exam"
SET "type" = 'CLASS_EXAM'
WHERE "id" IN (SELECT DISTINCT "examId" FROM "ExamClass");

CREATE TABLE IF NOT EXISTS "ClassExamQuestion" (
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

CREATE TABLE IF NOT EXISTS "ClassExamSubmission" (
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

CREATE TABLE IF NOT EXISTS "ClassExamSubmissionAnswer" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamQuestion_examId_orderIndex_key" ON "ClassExamQuestion"("examId", "orderIndex");
CREATE INDEX IF NOT EXISTS "ClassExamQuestion_examId_idx" ON "ClassExamQuestion"("examId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamSubmission_examId_studentId_key" ON "ClassExamSubmission"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassExamSubmission_examId_studentId_idx" ON "ClassExamSubmission"("examId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamSubmissionAnswer_submissionId_questionId_key" ON "ClassExamSubmissionAnswer"("submissionId", "questionId");
CREATE INDEX IF NOT EXISTS "ClassExamSubmissionAnswer_questionId_idx" ON "ClassExamSubmissionAnswer"("questionId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClassExamQuestion_examId_fkey') THEN
        ALTER TABLE "ClassExamQuestion" ADD CONSTRAINT "ClassExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClassExamSubmission_examId_fkey') THEN
        ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClassExamSubmission_studentId_fkey') THEN
        ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClassExamSubmissionAnswer_submissionId_fkey') THEN
        ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ClassExamSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='ClassExamSubmissionAnswer_questionId_fkey') THEN
        ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ClassExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
