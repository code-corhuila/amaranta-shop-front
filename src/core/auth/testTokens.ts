/** Tokens for tests: the shell never verifies a signature, so a made-up one is enough to exercise the reading of claims. */
function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fakeToken(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'RS256', typ: 'JWT' })}.${base64Url(claims)}.signature`;
}

export const NOW_SECONDS = 1_800_000_000;

export function validToken(claims: Record<string, unknown> = {}): string {
  return fakeToken({ sub: 'user-1', role: 'RECEPTIONIST', exp: NOW_SECONDS + 900, ...claims });
}
