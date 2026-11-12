import { sessionStore } from '../auth/sessionStore';
import { createShellApiClient } from './shellApiClient';

/**
 * What the shell lends to every portal as `shell/apiClient` (Annex H): the one HTTP client, already wired to the one
 * session. A portal that makes its own client would send requests with no token and no correlation id, in silence.
 */
export const apiClient = createShellApiClient(sessionStore);
