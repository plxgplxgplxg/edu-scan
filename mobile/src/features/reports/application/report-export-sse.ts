import { getApiBaseUrl } from '../../../api/config';
import { ApiError } from '../../../api/http';

export type ReportExportSseEvent = {
  type: 'report:queued' | 'report:processing' | 'report:completed' | 'report:failed';
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

function parseSseBlock(block: string): ReportExportSseEvent | null {
  const lines = block.split('\n');
  let eventType = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      data += line.slice(5).trim();
    }
  }

  if (!data) {
    return null;
  }

  const parsed = JSON.parse(data) as Omit<ReportExportSseEvent, 'type'> & {
    type?: ReportExportSseEvent['type'];
  };

  return {
    ...parsed,
    type: (parsed.type || eventType) as ReportExportSseEvent['type'],
  };
}

export function subscribeReportExportJob(params: {
  token: string;
  jobId: string;
  onEvent: (event: ReportExportSseEvent) => void;
  onError?: (error: Error) => void;
}) {
  const xhr = new XMLHttpRequest();
  let buffer = '';
  let lastLength = 0;

  const consumeStream = () => {
    const nextText = xhr.responseText?.slice(lastLength) ?? '';
    if (!nextText) {
      return;
    }

    buffer += nextText;
    lastLength = xhr.responseText.length;

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const event = parseSseBlock(block);
      if (event) {
        params.onEvent(event);
      }
    }
  };

  xhr.open('GET', `${getApiBaseUrl()}/reports/sse/${encodeURIComponent(params.jobId)}`);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('Authorization', `Bearer ${params.token}`);

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3 || xhr.readyState === 4) {
      consumeStream();
    }

    if (xhr.readyState === 4 && xhr.status >= 400) {
      params.onError?.(
        new ApiError(`Không thể theo dõi export job (${xhr.status})`, xhr.status),
      );
    }
  };

  xhr.onerror = () => {
    params.onError?.(new Error('Kết nối SSE export report thất bại'));
  };

  xhr.send();

  return () => {
    xhr.abort();
  };
}
