import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionStore } from '../auth/sessionStore';
import { validToken } from '../auth/testTokens';
import { apiClient } from './exposed';

describe('shell/apiClient, the client every portal receives', () => {
  afterEach(() => {
    sessionStore.signOut();
    vi.unstubAllGlobals();
  });

  it('is already wired to the session of the shell: the token and a correlation id go out with no work from the portal', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const token = validToken({ exp: Math.floor(Date.now() / 1000) + 900 });
    sessionStore.signIn(token);

    await apiClient.get('/api/v1/orders');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
