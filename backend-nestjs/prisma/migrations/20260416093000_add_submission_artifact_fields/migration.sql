ALTER TABLE "Submission"
ADD COLUMN "processedImageUrl" TEXT,
ADD COLUMN "annotatedImageUrl" TEXT,
ADD COLUMN "warpOverlayUrl" TEXT,
ADD COLUMN "answerScoresUrl" TEXT;

ALTER TABLE "SubmissionDetail"
ADD COLUMN "reviewReason" TEXT;
