import { ApiError, toApiError } from './apiError';

/** What a portal gets back: the body, the status, and where a created thing lives. */
export interface ApiResponse<T> {
  readonly status: number;
  readonly data: T;
  readonly location: string | null;
}

export interface RequestOptions {
  /** A screen that starts a newer request cancels the older one with this: the answer that arrives last must not win. */
  readonly signal?: AbortSignal;
  /** One per intention, reused when the same intention is retried, so a cut connection never creates a second order. */
  readonly idempotencyKey?: string;
}

export interface ApiClientOptions {
  /** The only place that knows where the gateway is. A portal asks for `/api/v1/...` and nothing else. */
  readonly baseUrl: string;
  readonly getToken: () => string | null;
  /** Called once when the gateway or a service says the credential is not valid: the session must end. */
  readonly onUnauthorized: () => void;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly newCorrelationId?: () => string;
}

export interface ApiClient {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** A JSON body if it is JSON, the raw text if it is not (a proxy's page), nothing if there is none. */
function parseBody(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * The one HTTP client of the system (Annex H). It adds what every request needs, so no screen does it and no screen can
 * forget it: the gateway as destination, the token, a new correlation id, a time limit, and one shape for every failure.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const newCorrelationId = options.newCorrelationId ?? (() => crypto.randomUUID());

  async function request<T>(method: string, path: string, body: unknown, requestOptions: RequestOptions = {}): Promise<ApiResponse<T>> {
    // `//host/x` and `https://host/x` would send the token to a host the shell never chose.
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new TypeError(`a portal asks for a relative path such as /api/v1/orders, not "${path}"`);
    }

    const correlationId = newCorrelationId();
    const headers = new Headers({ Accept: 'application/json', 'X-Correlation-Id': correlationId });
    const token = options.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (requestOptions.idempotencyKey) headers.set('Idempotency-Key', requestOptions.idempotencyKey);
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    const deadline = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      deadline.abort();
    }, timeoutMs);
    const signal = requestOptions.signal ? AbortSignal.any([requestOptions.signal, deadline.signal]) : deadline.signal;

    try {
      let response: Response;
      let text: string;
      try {
        const init: RequestInit = { method, headers, signal };
        if (body !== undefined) init.body = JSON.stringify(body);
        response = await fetchImpl(`${options.baseUrl}${path}`, init);
        text = await response.text();
      } catch (cause) {
        // The screen cancelled on purpose: that is not a failure to show, so it is not an ApiError.
        if (requestOptions.signal?.aborted) throw cause;
        const timeout = timedOut;
        throw new ApiError({
          status: 0,
          code: timeout ? 'TIMEOUT' : 'NETWORK',
          message: timeout ? `no answer in ${timeoutMs} ms` : cause instanceof Error ? cause.message : 'the request did not reach the gateway',
          traceId: correlationId,
        });
      }

      const parsed = parseBody(text);
      if (response.ok) {
        return { status: response.status, data: parsed as T, location: response.headers.get('Location') };
      }

      const error = toApiError(response.status, parsed, response.headers.get('X-Correlation-Id') ?? correlationId);
      if (response.status === 401) options.onUnauthorized();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (path, o) => request('GET', path, undefined, o),
    post: (path, body, o) => request('POST', path, body, o),
    put: (path, body, o) => request('PUT', path, body, o),
    patch: (path, body, o) => request('PATCH', path, body, o),
    delete: (path, o) => request('DELETE', path, undefined, o),
  };
}
