DO $$
DECLARE
  class_exam_count INTEGER := 0;
  class_exam_submission_count INTEGER := 0;
  remark_count INTEGER := 0;
  question_count INTEGER := 0;
  exam_question_count INTEGER := 0;
BEGIN
  IF to_regclass('"Exam"') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Exam' AND column_name = 'type'
  ) THEN
    SELECT COUNT(*) INTO class_exam_count FROM "Exam" WHERE "type" = 'CLASS_EXAM';
  END IF;

  IF to_regclass('"ClassExamSubmission"') IS NOT NULL THEN
    SELECT COUNT(*) INTO class_exam_submission_count FROM "ClassExamSubmission";
  END IF;

  IF to_regclass('"RemarkRequest"') IS NOT NULL THEN
    SELECT COUNT(*) INTO remark_count FROM "RemarkRequest";
  END IF;

  IF to_regclass('"Question"') IS NOT NULL THEN
    SELECT COUNT(*) INTO question_count FROM "Question";
  END IF;

  IF to_regclass('"ExamQuestion"') IS NOT NULL THEN
    SELECT COUNT(*) INTO exam_question_count FROM "ExamQuestion";
  END IF;

  IF class_exam_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove class exam scope: % Exam rows still have type CLASS_EXAM', class_exam_count;
  END IF;

  IF class_exam_submission_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove class exam scope: % ClassExamSubmission rows still exist', class_exam_submission_count;
  END IF;

  IF remark_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove remarks scope: % RemarkRequest rows still exist', remark_count;
  END IF;

  IF question_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove question bank scope: % Question rows still exist', question_count;
  END IF;

  IF exam_question_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove question bank scope: % ExamQuestion rows still exist', exam_question_count;
  END IF;
END $$;

DROP TABLE IF EXISTS "ClassExamSubmissionAnswer";
DROP TABLE IF EXISTS "ClassExamSubmission";
DROP TABLE IF EXISTS "ClassExamQuestion";
DROP TABLE IF EXISTS "RemarkRequest";
DROP TABLE IF EXISTS "QuestionTag";
DROP TABLE IF EXISTS "ExamQuestion";
DROP TABLE IF EXISTS "Question";
DROP TABLE IF EXISTS "Tag";

ALTER TABLE "Exam" DROP COLUMN IF EXISTS "type";

DROP TYPE IF EXISTS "ClassExamSubmissionStatus";
DROP TYPE IF EXISTS "QuestionType";
DROP TYPE IF EXISTS "Difficulty";
DROP TYPE IF EXISTS "RemarkStatus";
DROP TYPE IF EXISTS "ExamType";
