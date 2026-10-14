import { describe, expect, it, vi } from 'vitest';
import { createSessionStore } from '../auth/session';
import { NOW_SECONDS, validToken } from '../auth/testTokens';
import { gatewayUrl } from '../config';
import { createShellApiClient } from './shellApiClient';

function setup(answer: Response) {
  const calls: { url: string; headers: Headers }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    return answer.clone();
  }) as unknown as typeof fetch;
  const session = createSessionStore({ storage: null, now: () => NOW_SECONDS * 1000 });
  const client = createShellApiClient(session, { fetchImpl });
  return { client, session, calls };
}

describe('the client of the shell, wired to the session', () => {
  it('talks to the gateway the shell is configured with', async () => {
    const { client, calls } = setup(new Response('{}', { status: 200 }));
    await client.get('/api/v1/products');
    expect(calls[0]?.url).toBe(`${gatewayUrl}/api/v1/products`);
  });

  it('sends the token of the session, and none while there is no session', async () => {
    const { client, session, calls } = setup(new Response('{}', { status: 200 }));
    await client.get('/api/v1/products');
    const token = validToken();
    session.signIn(token);
    await client.get('/api/v1/orders');
    expect(calls[0]?.headers.has('Authorization')).toBe(false);
    expect(calls[1]?.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('ends the session when the gateway answers 401', async () => {
    const { client, session } = setup(new Response('{"error":"UNAUTHORIZED","message":"m","traceId":"t"}', { status: 401 }));
    session.signIn(validToken());
    await client.get('/api/v1/orders').catch(() => undefined);
    expect(session.getSession()).toBeNull();
  });
});
