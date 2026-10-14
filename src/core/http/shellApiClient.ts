import type { SessionStore } from '../auth/session';
import { gatewayUrl } from '../config';
import { createApiClient, type ApiClient, type ApiClientOptions } from './apiClient';

/** The client of the shell: the gateway it is configured with, the token of the session, and a 401 ends that session. */
export function createShellApiClient(
  session: SessionStore,
  extra: Partial<Pick<ApiClientOptions, 'fetchImpl' | 'newCorrelationId' | 'timeoutMs'>> = {},
): ApiClient {
  return createApiClient({
    baseUrl: gatewayUrl,
    getToken: () => session.getToken(),
    onUnauthorized: () => session.signOut(),
    ...extra,
  });
}
