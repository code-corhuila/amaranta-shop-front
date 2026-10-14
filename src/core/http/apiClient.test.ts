import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiError';
import { createApiClient, type ApiClientOptions } from './apiClient';

const GATEWAY = 'http://gateway.test:8000';

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
}

/** A fetch that records what it was given and answers what the test says. */
function fakeFetch(answer: () => Response | Promise<Response> = () => json({ ok: true })) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return answer();
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function headersOf(call: { init: RequestInit } | undefined): Headers {
  return new Headers(call?.init.headers);
}

function build(overrides: Partial<ApiClientOptions> & { answer?: () => Response | Promise<Response> } = {}) {
  const { answer, ...options } = overrides;
  const net = fakeFetch(answer);
  let n = 0;
  const onUnauthorized = vi.fn();
  const client = createApiClient({
    baseUrl: GATEWAY,
    getToken: () => 'abc.def.ghi',
    onUnauthorized,
    fetchImpl: net.fetchImpl,
    newCorrelationId: () => `corr-${++n}`,
    ...options,
  });
  return { client, calls: net.calls, onUnauthorized };
}

describe('where a request goes', () => {
  it('asks the gateway for the relative path a portal gives, and only the client knows the gateway', async () => {
    const { client, calls } = build();
    await client.get('/api/v1/products?page=2&limit=5');
    expect(calls[0]?.url).toBe(`${GATEWAY}/api/v1/products?page=2&limit=5`);
  });

  it.each(['https://evil.example/api/v1/orders', '//evil.example/x', 'api/v1/orders'])('refuses %s: a portal never names a host', async (path) => {
    const { client, calls } = build();
    await expect(client.get(path)).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});

describe('what every request carries', () => {
  it('attaches the token', async () => {
    const { client, calls } = build();
    await client.get('/api/v1/orders');
    expect(headersOf(calls[0]).get('Authorization')).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization at all when there is no session: a visitor can browse and buy', async () => {
    const { client, calls } = build({ getToken: () => null });
    await client.get('/api/v1/products');
    expect(headersOf(calls[0]).has('Authorization')).toBe(false);
  });

  it('creates a new X-Correlation-Id for every request', async () => {
    const { client, calls } = build();
    await client.get('/api/v1/products');
    await client.get('/api/v1/products');
    expect(headersOf(calls[0]).get('X-Correlation-Id')).toBe('corr-1');
    expect(headersOf(calls[1]).get('X-Correlation-Id')).toBe('corr-2');
  });

  it('asks for JSON, and sends a body as JSON', async () => {
    const { client, calls } = build();
    await client.post('/api/v1/orders', { items: [{ productId: 'p1', quantity: 2 }] });
    const headers = headersOf(calls[0]);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ items: [{ productId: 'p1', quantity: 2 }] }));
  });

  it('sets no Content-Type on a request without a body', async () => {
    const { client, calls } = build();
    await client.get('/api/v1/products');
    expect(headersOf(calls[0]).has('Content-Type')).toBe(false);
  });

  it('sends the Idempotency-Key the screen chose, the same one every time it retries', async () => {
    const { client, calls } = build();
    await client.post('/api/v1/orders', {}, { idempotencyKey: 'intent-1' });
    await client.post('/api/v1/orders', {}, { idempotencyKey: 'intent-1' });
    expect(headersOf(calls[0]).get('Idempotency-Key')).toBe('intent-1');
    expect(headersOf(calls[1]).get('Idempotency-Key')).toBe('intent-1');
  });
});

describe('what comes back', () => {
  it('gives the portal the body, the status and the Location of what was created', async () => {
    const { client } = build({ answer: () => json({ id: 'o1' }, { status: 201, headers: { 'Content-Type': 'application/json', Location: '/api/v1/orders/o1' } }) });
    const response = await client.post<{ id: string }>('/api/v1/orders', {});
    expect(response).toEqual({ status: 201, data: { id: 'o1' }, location: '/api/v1/orders/o1' });
  });

  it('understands a 204 with no body', async () => {
    const { client } = build({ answer: () => new Response(null, { status: 204 }) });
    const response = await client.delete('/api/v1/admin/products/p1');
    expect(response.status).toBe(204);
    expect(response.data).toBeUndefined();
  });

  it('supports the five verbs', async () => {
    const { client, calls } = build();
    await client.get('/a');
    await client.post('/a', {});
    await client.put('/a', {});
    await client.patch('/a', {});
    await client.delete('/a');
    expect(calls.map((c) => c.init.method)).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });
});

describe('failures reach the portal in one shape', () => {
  it('turns the envelope of a service into an ApiError with the reference', async () => {
    const { client } = build({
      answer: () => json({ error: 'VALIDATION_ERROR', message: 'invalid', details: [{ field: 'quantity', message: 'must be positive' }], traceId: 'trace-9' }, { status: 400 }),
    });
    const error = await client.post('/api/v1/orders', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', traceId: 'trace-9', details: [{ field: 'quantity', message: 'must be positive' }] });
  });

  it('uses the correlation id of the request as the reference when the answer is not an envelope', async () => {
    const { client } = build({ answer: () => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }) });
    const error = (await client.get('/api/v1/products').catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 502, code: 'HTTP_502', traceId: 'corr-1' });
  });

  it('reports a lost connection as status 0, NETWORK', async () => {
    const { client } = build({
      answer: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const error = (await client.get('/api/v1/products').catch((e: unknown) => e)) as ApiError;
    expect(error).toMatchObject({ status: 0, code: 'NETWORK', traceId: 'corr-1' });
    expect(error.userMessage).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
  });
});

describe('a 401 ends the session', () => {
  it('tells the session once, and still hands the error to the screen', async () => {
    const { client, onUnauthorized } = build({ answer: () => json({ error: 'UNAUTHORIZED', message: 'a credential is required', traceId: 't' }, { status: 401 }) });
    await expect(client.get('/api/v1/orders')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not end the session for any other failure', async () => {
    const { client, onUnauthorized } = build({ answer: () => json({ error: 'FORBIDDEN', message: 'no', traceId: 't' }, { status: 403 }) });
    await client.get('/api/v1/admin/products').catch(() => undefined);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('time and cancelling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A service that never answers, until the client gives up. */
  function hang(): typeof fetch {
    return ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason ?? new DOMException('aborted', 'AbortError')));
      })) as typeof fetch;
  }

  it('gives up after 10 seconds with status 0, TIMEOUT', async () => {
    const { client } = build({ fetchImpl: hang() });
    const outcome = client.get('/api/v1/products').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(9_999);
    let settled = false;
    void outcome.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toMatchObject({ status: 0, code: 'TIMEOUT', traceId: 'corr-1' });
  });

  it('lets a screen cancel: a newer request replaces the older one, and that is not an error to show', async () => {
    const { client, onUnauthorized } = build({ fetchImpl: hang() });
    const controller = new AbortController();
    const outcome = client.get('/api/v1/products', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const error = await outcome;
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
