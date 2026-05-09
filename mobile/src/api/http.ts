import { getApiBaseUrl } from './config';

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

type WrappedResponse<T> = {
  data: T;
  message: string;
  statusCode: number;
};

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  let body: any;

  if (options.body && isFormData(options.body)) {
    body = options.body;
  } else if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  } else if (typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
    body = options.body;
  } else if (options.body) {
    body = options.body;
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = `${getApiBaseUrl()}${path}`;
  console.debug('[API]', options.method ?? 'GET', url, { headers, body });

  let responseValue: globalThis.Response;

  try {
    responseValue = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch (error) {
    console.error('[API] Network request failed', { url, method: options.method ?? 'GET', error });
    throw error;
  }

  const text = await responseValue.text();
  const payload = text ? JSON.parse(text) : null;

  if (!responseValue.ok) {
    throw new ApiError(
      payload?.message || 'Có lỗi xảy ra khi gọi API',
      responseValue.status,
    );
  }

  return (payload as WrappedResponse<T>).data;
}
