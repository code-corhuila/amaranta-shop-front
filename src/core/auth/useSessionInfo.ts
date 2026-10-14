import { useSession } from './SessionProvider';

/** What a portal may know about the session. There is no token in it, and there will not be: only the shell holds it. */
export interface SessionInfo {
  readonly signedIn: boolean;
  readonly role: string | null;
  readonly subject: string | null;
}

const NOBODY: SessionInfo = { signedIn: false, role: null, subject: null };

/** Who is signed in and with which role, so a screen can show or hide what the person may do. The services still decide. */
export function useSessionInfo(): SessionInfo {
  const session = useSession();
  if (session === null) return NOBODY;
  return { signedIn: true, role: session.role, subject: session.subject };
}
