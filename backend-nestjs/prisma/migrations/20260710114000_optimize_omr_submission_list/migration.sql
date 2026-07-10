-- Supports the two pagination paths used by the OMR review screen:
-- all submissions in a batch, and submissions filtered by status.
CREATE INDEX IF NOT EXISTS "Submission_batchId_createdAt_idx"
ON "Submission"("batchId", "createdAt");

CREATE INDEX IF NOT EXISTS "Submission_batchId_status_createdAt_idx"
ON "Submission"("batchId", "status", "createdAt");
