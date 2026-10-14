/** One invalid field, as the services name it: `{field, message}`. */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** The common envelope every service and the gateway answer an error with (norm 5.3). */
export interface ErrorEnvelope {
  readonly error: string;
  readonly message: string;
  readonly details?: readonly FieldError[];
  readonly traceId: string;
}

/**
 * The text a person reads is decided HERE, by status, and nowhere else (Annex H). A screen never writes its own, and
 * what a service wrote for a developer (`message`) is never shown: it can carry the name of a class or a query.
 */
export function userMessageFor(status: number, code: string): string {
  if (status === 0) {
    return code === 'TIMEOUT'
      ? 'La solicitud tardó demasiado. Inténtalo de nuevo.'
      : 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.';
  }
  switch (status) {
    case 400:
      return 'Revisa los datos ingresados.';
    case 401:
      return 'Tu sesión terminó. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para hacer esto.';
    case 404:
      return 'No encontramos lo que buscas.';
    case 422:
      return 'No se pudo completar la operación.';
    case 429:
      return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    case 503:
      return 'El servicio no está disponible. Inténtalo más tarde.';
    default:
      return status >= 500 ? 'Ocurrió un error en el servidor. Inténtalo más tarde.' : 'No se pudo completar la solicitud.';
  }
}

export interface ApiErrorInit {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details?: readonly FieldError[];
  readonly traceId: string;
}

/**
 * Every failure reaches a portal as this, whatever caused it: a service's envelope, a page from a proxy, a timeout or a
 * lost connection. `status` is 0 when no answer arrived at all.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: readonly FieldError[];
  /** The `X-Correlation-Id` of the request: the reference a person gives, and the line to find in the logs. */
  readonly traceId: string;
  /** What to show the person. Never the service's own `message`. */
  readonly userMessage: string;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [];
    this.traceId = init.traceId;
    this.userMessage = userMessageFor(init.status, init.code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) =>
    isRecord(entry) && typeof entry['field'] === 'string' && typeof entry['message'] === 'string'
      ? [{ field: entry['field'], message: entry['message'] }]
      : [],
  );
}

/** Reads an error answer defensively: it may be the envelope, or anything else a proxy or a crash put there. */
export function toApiError(status: number, body: unknown, fallbackTraceId: string): ApiError {
  const envelope = isRecord(body) ? body : {};
  const code = typeof envelope['error'] === 'string' && envelope['error'] !== '' ? envelope['error'] : `HTTP_${status}`;
  const message = typeof envelope['message'] === 'string' && envelope['message'] !== '' ? envelope['message'] : `HTTP ${status}`;
  const traceId = typeof envelope['traceId'] === 'string' && envelope['traceId'] !== '' ? envelope['traceId'] : fallbackTraceId;
  return new ApiError({ status, code, message, details: toFieldErrors(envelope['details']), traceId });
}
