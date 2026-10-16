/**
 * Where the gateway is. Only the shell knows this (Annex H, rule 3): a portal asks for `/api/v1/...` and the shell's
 * client prefixes it. It is configuration of the shell, not an environment variable, so there is no `.env` to forget.
 */
export const gatewayUrl = 'http://localhost:8000';
