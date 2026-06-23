import { OmrBatchStatus } from '@prisma/client';

export const OMR_SSE_EVENT_TYPES = [
  'batch:file:queued',
  'batch:file:uploading',
  'batch:file:processing',
  'batch:file:done',
  'batch:file:failed',
  'batch:completed',
] as const;

export type OmrSseEventType = (typeof OMR_SSE_EVENT_TYPES)[number];

export type OmrSseEvent = {
  type: OmrSseEventType;
  batchId: string;
  totalFiles?: number;
  processedFiles?: number;
  pct?: number;
  fileIndex?: number;
  stage?: 'uploading' | 'processing' | 'done' | 'failed';
  studentCode?: string | null;
  score?: number;
  needsReview?: boolean;
  errorMessage?: string;
  status?: OmrBatchStatus;
};

export function buildOmrSseChannelId(batchId: string) {
  return `omr:${batchId}`;
}
