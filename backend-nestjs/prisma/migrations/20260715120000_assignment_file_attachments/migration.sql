-- Add optional single-file attachment metadata to assignments.
ALTER TABLE "Assignment"
ADD COLUMN "instructionFileUrl" TEXT,
ADD COLUMN "instructionFilePublicId" TEXT,
ADD COLUMN "instructionFileOriginalName" TEXT,
ADD COLUMN "instructionFileMimeType" TEXT,
ADD COLUMN "instructionFileSizeBytes" INTEGER,
ADD COLUMN "instructionFileUploadedAt" TIMESTAMP(3);

-- Extend student assignment submissions with optional note and file metadata.
ALTER TABLE "AssignmentSubmit"
ADD COLUMN "note" TEXT,
ADD COLUMN "filePublicId" TEXT,
ADD COLUMN "fileOriginalName" TEXT,
ADD COLUMN "fileMimeType" TEXT,
ADD COLUMN "fileSizeBytes" INTEGER,
ADD COLUMN "fileUploadedAt" TIMESTAMP(3);

ALTER TABLE "AssignmentSubmit"
ALTER COLUMN "fileUrl" DROP NOT NULL;
