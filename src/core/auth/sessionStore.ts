import { createSessionStore } from './session';

/** The one session of the shell. The screens read it through the provider; the client that portals use reads it too. */
export const sessionStore = createSessionStore();
