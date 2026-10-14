/**
 * What the shell lends to every portal as `shell/auth` (Annex H): who is signed in, and a guard for a screen that needs a
 * role. Never the token, never the way to sign in or out: the session belongs to the shell.
 */
export { RequireRole } from './RequireRole';
export { useSessionInfo, type SessionInfo } from './useSessionInfo';
