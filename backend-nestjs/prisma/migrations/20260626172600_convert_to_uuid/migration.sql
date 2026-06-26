DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OmrBatchStatus') THEN
        CREATE TYPE "OmrBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');
    END IF;
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SubmissionStatus' AND e.enumlabel = 'NEED_REVIEW') THEN
        ALTER TYPE "SubmissionStatus" RENAME VALUE 'NEED_REVIEW' TO 'NEEDS_REVIEW';
    END IF;
END$$;

ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_teacherId_fkey";
ALTER TABLE "ClassEnrollment" DROP CONSTRAINT IF EXISTS "ClassEnrollment_classId_fkey";
ALTER TABLE "ClassEnrollment" DROP CONSTRAINT IF EXISTS "ClassEnrollment_studentId_fkey";
ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_teacherId_fkey";
ALTER TABLE "ExamVariant" DROP CONSTRAINT IF EXISTS "ExamVariant_examId_fkey";
ALTER TABLE "ExamClass" DROP CONSTRAINT IF EXISTS "ExamClass_classId_fkey";
ALTER TABLE "ExamClass" DROP CONSTRAINT IF EXISTS "ExamClass_examId_fkey";
ALTER TABLE "AnswerKey" DROP CONSTRAINT IF EXISTS "AnswerKey_variantId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_examId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_resolvedVariantId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_studentId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_batchId_fkey";
ALTER TABLE "SubmissionDetail" DROP CONSTRAINT IF EXISTS "SubmissionDetail_submissionId_fkey";
ALTER TABLE "ClassExamQuestion" DROP CONSTRAINT IF EXISTS "ClassExamQuestion_examId_fkey";
ALTER TABLE "ClassExamSubmission" DROP CONSTRAINT IF EXISTS "ClassExamSubmission_examId_fkey";
ALTER TABLE "ClassExamSubmission" DROP CONSTRAINT IF EXISTS "ClassExamSubmission_studentId_fkey";
ALTER TABLE "ClassExamSubmissionAnswer" DROP CONSTRAINT IF EXISTS "ClassExamSubmissionAnswer_questionId_fkey";
ALTER TABLE "ClassExamSubmissionAnswer" DROP CONSTRAINT IF EXISTS "ClassExamSubmissionAnswer_submissionId_fkey";
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_teacherId_fkey";
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_classId_fkey";
ALTER TABLE "AssignmentSubmit" DROP CONSTRAINT IF EXISTS "AssignmentSubmit_assignmentId_fkey";
ALTER TABLE "AssignmentSubmit" DROP CONSTRAINT IF EXISTS "AssignmentSubmit_studentId_fkey";
ALTER TABLE "RemarkRequest" DROP CONSTRAINT IF EXISTS "RemarkRequest_studentId_fkey";
ALTER TABLE "RemarkRequest" DROP CONSTRAINT IF EXISTS "RemarkRequest_submissionDetailId_fkey";
ALTER TABLE "RemarkRequest" DROP CONSTRAINT IF EXISTS "RemarkRequest_submissionId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_teacherId_fkey";

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_pkey";
ALTER TABLE "ClassEnrollment" DROP CONSTRAINT IF EXISTS "ClassEnrollment_pkey";
ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_pkey";
ALTER TABLE "ExamVariant" DROP CONSTRAINT IF EXISTS "ExamVariant_pkey";
ALTER TABLE "ExamClass" DROP CONSTRAINT IF EXISTS "ExamClass_pkey";
ALTER TABLE "AnswerKey" DROP CONSTRAINT IF EXISTS "AnswerKey_pkey";
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_pkey";
ALTER TABLE "SubmissionDetail" DROP CONSTRAINT IF EXISTS "SubmissionDetail_pkey";
ALTER TABLE "ClassExamQuestion" DROP CONSTRAINT IF EXISTS "ClassExamQuestion_pkey";
ALTER TABLE "ClassExamSubmission" DROP CONSTRAINT IF EXISTS "ClassExamSubmission_pkey";
ALTER TABLE "ClassExamSubmissionAnswer" DROP CONSTRAINT IF EXISTS "ClassExamSubmissionAnswer_pkey";
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_pkey";
ALTER TABLE "AssignmentSubmit" DROP CONSTRAINT IF EXISTS "AssignmentSubmit_pkey";
ALTER TABLE "RemarkRequest" DROP CONSTRAINT IF EXISTS "RemarkRequest_pkey";
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_pkey";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "studentCode" TEXT;
ALTER TABLE "User" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

ALTER TABLE "Class" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                    ALTER COLUMN "teacherId" TYPE UUID USING "teacherId"::uuid;

ALTER TABLE "ClassEnrollment" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                              ALTER COLUMN "classId" TYPE UUID USING "classId"::uuid,
                              ALTER COLUMN "studentId" TYPE UUID USING "studentId"::uuid;

ALTER TABLE "Exam" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                    ALTER COLUMN "teacherId" TYPE UUID USING "teacherId"::uuid;
ALTER TABLE "Exam" DROP COLUMN IF EXISTS "questionCount";

ALTER TABLE "ExamVariant" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                           ALTER COLUMN "examId" TYPE UUID USING "examId"::uuid;

ALTER TABLE "ExamClass" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                        ALTER COLUMN "examId" TYPE UUID USING "examId"::uuid,
                        ALTER COLUMN "classId" TYPE UUID USING "classId"::uuid;

ALTER TABLE "AnswerKey" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                        ALTER COLUMN "variantId" TYPE UUID USING "variantId"::uuid;

ALTER TABLE "Submission" DROP COLUMN IF EXISTS "totalScore";
ALTER TABLE "Submission" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                         ALTER COLUMN "examId" TYPE UUID USING "examId"::uuid,
                         ALTER COLUMN "resolvedVariantId" TYPE UUID USING "resolvedVariantId"::uuid,
                         ALTER COLUMN "studentId" TYPE UUID USING "studentId"::uuid,
                         ALTER COLUMN "batchId" TYPE UUID USING "batchId"::uuid,
                         ALTER COLUMN "matchedStudentId" TYPE UUID USING "matchedStudentId"::uuid;

ALTER TABLE "SubmissionDetail" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                               ALTER COLUMN "submissionId" TYPE UUID USING "submissionId"::uuid;

ALTER TABLE "ClassExamQuestion" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                                ALTER COLUMN "examId" TYPE UUID USING "examId"::uuid;

ALTER TABLE "ClassExamSubmission" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                                  ALTER COLUMN "examId" TYPE UUID USING "examId"::uuid,
                                  ALTER COLUMN "studentId" TYPE UUID USING "studentId"::uuid;

ALTER TABLE "ClassExamSubmissionAnswer" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                                        ALTER COLUMN "submissionId" TYPE UUID USING "submissionId"::uuid,
                                        ALTER COLUMN "questionId" TYPE UUID USING "questionId"::uuid;

ALTER TABLE "Assignment" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                         ALTER COLUMN "teacherId" TYPE UUID USING "teacherId"::uuid;
ALTER TABLE "Assignment" DROP COLUMN IF EXISTS "classId";

ALTER TABLE "AssignmentSubmit" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                               ALTER COLUMN "assignmentId" TYPE UUID USING "assignmentId"::uuid,
                               ALTER COLUMN "studentId" TYPE UUID USING "studentId"::uuid;

ALTER TABLE "RemarkRequest" DROP COLUMN IF EXISTS "submissionId";
ALTER TABLE "RemarkRequest" ADD COLUMN IF NOT EXISTS "reviewerId" UUID;
ALTER TABLE "RemarkRequest" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "RemarkRequest" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                            ALTER COLUMN "submissionDetailId" TYPE UUID USING "submissionDetailId"::uuid,
                            ALTER COLUMN "studentId" TYPE UUID USING "studentId"::uuid;

ALTER TABLE "Question" DROP COLUMN IF EXISTS "tags";
ALTER TABLE "Question" ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
                       ALTER COLUMN "teacherId" TYPE UUID USING "teacherId"::uuid;

CREATE TABLE IF NOT EXISTS "ExamQuestion" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionId" UUID,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OmrBatch" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "status" "OmrBatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalFiles" INTEGER NOT NULL,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OmrBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssignmentClass" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "classId" UUID NOT NULL,

    CONSTRAINT "AssignmentClass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionTag" (
    "questionId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
);

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE "Class" ADD CONSTRAINT "Class_pkey" PRIMARY KEY ("id");
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id");
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_pkey" PRIMARY KEY ("id");
ALTER TABLE "ExamVariant" ADD CONSTRAINT "ExamVariant_pkey" PRIMARY KEY ("id");
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_pkey" PRIMARY KEY ("id");
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_pkey" PRIMARY KEY ("id");
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_pkey" PRIMARY KEY ("id");
ALTER TABLE "SubmissionDetail" ADD CONSTRAINT "SubmissionDetail_pkey" PRIMARY KEY ("id");
ALTER TABLE "ClassExamQuestion" ADD CONSTRAINT "ClassExamQuestion_pkey" PRIMARY KEY ("id");
ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_pkey" PRIMARY KEY ("id");
ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_pkey" PRIMARY KEY ("id");
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id");
ALTER TABLE "AssignmentSubmit" ADD CONSTRAINT "AssignmentSubmit_pkey" PRIMARY KEY ("id");
ALTER TABLE "RemarkRequest" ADD CONSTRAINT "RemarkRequest_pkey" PRIMARY KEY ("id");
ALTER TABLE "Question" ADD CONSTRAINT "Question_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX IF NOT EXISTS "ExamQuestion_examId_questionNumber_key" ON "ExamQuestion"("examId", "questionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId", "questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentClass_assignmentId_classId_key" ON "AssignmentClass"("assignmentId", "classId");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "AnswerKey_variantId_questionNumber_key" ON "AnswerKey"("variantId", "questionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentSubmit_assignmentId_studentId_key" ON "AssignmentSubmit"("assignmentId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassEnrollment_classId_studentId_key" ON "ClassEnrollment"("classId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassExamQuestion_examId_idx" ON "ClassExamQuestion"("examId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamQuestion_examId_orderIndex_key" ON "ClassExamQuestion"("examId", "orderIndex");
CREATE INDEX IF NOT EXISTS "ClassExamSubmission_examId_studentId_idx" ON "ClassExamSubmission"("examId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamSubmission_examId_studentId_key" ON "ClassExamSubmission"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassExamSubmissionAnswer_questionId_idx" ON "ClassExamSubmissionAnswer"("questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassExamSubmissionAnswer_submissionId_questionId_key" ON "ClassExamSubmissionAnswer"("submissionId", "questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamClass_examId_classId_key" ON "ExamClass"("examId", "classId");
CREATE INDEX IF NOT EXISTS "ExamVariant_examId_idx" ON "ExamVariant"("examId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamVariant_examId_testCode_key" ON "ExamVariant"("examId", "testCode");
CREATE UNIQUE INDEX IF NOT EXISTS "RemarkRequest_submissionDetailId_studentId_key" ON "RemarkRequest"("submissionDetailId", "studentId");
CREATE INDEX IF NOT EXISTS "Submission_examId_studentId_idx" ON "Submission"("examId", "studentId");
CREATE INDEX IF NOT EXISTS "Submission_batchId_idx" ON "Submission"("batchId");
CREATE INDEX IF NOT EXISTS "Submission_studentCode_idx" ON "Submission"("studentCode");
CREATE INDEX IF NOT EXISTS "Submission_resolvedVariantId_idx" ON "Submission"("resolvedVariantId");
CREATE UNIQUE INDEX IF NOT EXISTS "SubmissionDetail_submissionId_questionNumber_key" ON "SubmissionDetail"("submissionId", "questionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_studentCode_key" ON "User"("studentCode");

ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamVariant" ADD CONSTRAINT "ExamVariant_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamClass" ADD CONSTRAINT "ExamClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ExamVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OmrBatch" ADD CONSTRAINT "OmrBatch_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OmrBatch" ADD CONSTRAINT "OmrBatch_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_resolvedVariantId_fkey" FOREIGN KEY ("resolvedVariantId") REFERENCES "ExamVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OmrBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionDetail" ADD CONSTRAINT "SubmissionDetail_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExamQuestion" ADD CONSTRAINT "ClassExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExamSubmission" ADD CONSTRAINT "ClassExamSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ClassExamSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExamSubmissionAnswer" ADD CONSTRAINT "ClassExamSubmissionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ClassExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssignmentClass" ADD CONSTRAINT "AssignmentClass_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentClass" ADD CONSTRAINT "AssignmentClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmit" ADD CONSTRAINT "AssignmentSubmit_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssignmentSubmit" ADD CONSTRAINT "AssignmentSubmit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RemarkRequest" ADD CONSTRAINT "RemarkRequest_submissionDetailId_fkey" FOREIGN KEY ("submissionDetailId") REFERENCES "SubmissionDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RemarkRequest" ADD CONSTRAINT "RemarkRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RemarkRequest" ADD CONSTRAINT "RemarkRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
