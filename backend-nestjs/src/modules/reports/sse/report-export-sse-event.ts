export const REPORT_EXPORT_SSE_EVENT_TYPES = [
  'report:queued',
  'report:processing',
  'report:completed',
  'report:failed',
] as const;

export type ReportExportSseEventType =
  (typeof REPORT_EXPORT_SSE_EVENT_TYPES)[number];

export type ReportExportSseEvent = {
  type: ReportExportSseEventType;
  jobId: string;
  classId: string;
  format: 'xlsx' | 'pdf';
  scope: string;
  fileName?: string;
  mimeType?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
};

export function buildReportExportSseChannelId(jobId: string) {
  return `reports:${jobId}`;
}
