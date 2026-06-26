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

type BinaryResponse = {
  buffer: ArrayBuffer;
  contentType: string;
  fileName?: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

type SessionProvider = () => AuthSession | null;
type SessionUpdater = (session: AuthSession) => void;
type SessionInvalidator = () => void;

let getSession: SessionProvider = () => null;
let applySession: SessionUpdater = () => undefined;
let clearSession: SessionInvalidator = () => undefined;
let inFlightRefresh: Promise<AuthSession> | null = null;

export function configureAuthSession(options: {
  getSession: SessionProvider;
  applySession: SessionUpdater;
  clearSession: SessionInvalidator;
}) {
  getSession = options.getSession;
  applySession = options.applySession;
  clearSession = options.clearSession;
}

function isFormData(value: unknown): value is FormData {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as any).append === 'function'
  );
}

async function refreshAccessToken(): Promise<AuthSession> {
  const session = getSession();
  const refreshToken = session?.refreshToken;

  if (!refreshToken) {
    throw new ApiError('Refresh token is required', 401);
  }

  const responseValue = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const text = await responseValue.text();
  const payload = text ? JSON.parse(text) : null;

  if (!responseValue.ok) {
    throw new ApiError(payload?.message || 'Refresh token failed', responseValue.status);
  }

  const nextSession = (payload as WrappedResponse<AuthSession>).data;
  applySession(nextSession);
  return nextSession;
}

async function ensureRefreshedSession(): Promise<AuthSession> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken().finally(() => {
      inFlightRefresh = null;
    });
  }

  return inFlightRefresh;
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const attemptRequest = async (tokenOverride?: string | null) => {
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

    const authToken = tokenOverride ?? options.token;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
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

    return { responseValue, payload };
  };

  let { responseValue, payload } = await attemptRequest();

  const isAccessExpired =
    responseValue.status === 401
    && options.token
    && path !== '/auth/refresh';

  if (isAccessExpired) {
    try {
      const nextSession = await ensureRefreshedSession();
      ({ responseValue, payload } = await attemptRequest(nextSession.accessToken));
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  if (!responseValue.ok) {
    throw new ApiError(
      payload?.message || 'Có lỗi xảy ra khi gọi API',
      responseValue.status,
    );
  }

  return (payload as WrappedResponse<T>).data;
}

export async function requestBinary(
  path: string,
  options: RequestOptions = {},
): Promise<BinaryResponse> {
  const attemptRequest = async (tokenOverride?: string | null) => {
    const headers: Record<string, string> = {
      Accept: '*/*',
      ...(options.headers ?? {}),
    };

    const authToken = tokenOverride ?? options.token;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const responseValue = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
    });

    return responseValue;
  };

  let responseValue = await attemptRequest();

  const isAccessExpired =
    responseValue.status === 401
    && options.token
    && path !== '/auth/refresh';

  if (isAccessExpired) {
    try {
      const nextSession = await ensureRefreshedSession();
      responseValue = await attemptRequest(nextSession.accessToken);
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  if (!responseValue.ok) {
    const text = await responseValue.text();
    const payload = text ? JSON.parse(text) : null;
    throw new ApiError(
      payload?.message || 'Có lỗi xảy ra khi tải tệp',
      responseValue.status,
    );
  }

  const buffer = await responseValue.arrayBuffer();
  const contentDisposition = responseValue.headers.get('content-disposition');
  const fileNameMatch = contentDisposition?.match(/filename="([^"]+)"/i);

  return {
    buffer,
    contentType: responseValue.headers.get('content-type') || 'application/octet-stream',
    fileName: fileNameMatch?.[1],
  };
}
