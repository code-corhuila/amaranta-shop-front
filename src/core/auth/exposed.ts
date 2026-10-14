/**
 * What the shell lends to every portal as `shell/auth` (Annex H): who is signed in, and guards for a screen that needs a person
 * or a role. Never the token, never the way to sign in or out: the session belongs to the shell.
 */
export { RequireAuth } from './RequireAuth';
export { RequireRole } from './RequireRole';
export { useSessionInfo, type SessionInfo } from './useSessionInfo';
