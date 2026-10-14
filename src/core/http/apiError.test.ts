import { describe, expect, it } from 'vitest';
import { ApiError, toApiError, userMessageFor } from './apiError';

describe('userMessageFor: the message a person reads is decided here, by status, and nowhere else', () => {
  it.each([
    [400, 'Revisa los datos ingresados.'],
    [401, 'Tu sesión terminó. Inicia sesión de nuevo.'],
    [403, 'No tienes permiso para hacer esto.'],
    [404, 'No encontramos lo que buscas.'],
    [422, 'No se pudo completar la operación.'],
    [429, 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'],
    [503, 'El servicio no está disponible. Inténtalo más tarde.'],
    [500, 'Ocurrió un error en el servidor. Inténtalo más tarde.'],
    [502, 'Ocurrió un error en el servidor. Inténtalo más tarde.'],
  ])('status %i', (status, message) => {
    expect(userMessageFor(status, 'ANY')).toBe(message);
  });

  it('tells a timeout from a lost connection, both with status 0', () => {
    expect(userMessageFor(0, 'TIMEOUT')).toBe('La solicitud tardó demasiado. Inténtalo de nuevo.');
    expect(userMessageFor(0, 'NETWORK')).toBe('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
  });

  it('has a neutral message for a status nobody planned for', () => {
    expect(userMessageFor(418, 'TEAPOT')).toBe('No se pudo completar la solicitud.');
  });
});

describe('toApiError', () => {
  it('reads the common envelope, with the detail of each invalid field', () => {
    const error = toApiError(
      400,
      {
        error: 'VALIDATION_ERROR',
        message: 'the request has invalid fields',
        details: [{ field: 'contactName', message: 'must not be blank' }],
        traceId: 'trace-1',
      },
      'fallback',
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('the request has invalid fields');
    expect(error.details).toEqual([{ field: 'contactName', message: 'must not be blank' }]);
    expect(error.traceId).toBe('trace-1');
    expect(error.userMessage).toBe('Revisa los datos ingresados.');
  });

  it('keeps the business rule the service names, apart from the message for the person', () => {
    const error = toApiError(
      422,
      { error: 'BUSINESS_RULE_VIOLATION', message: 'rule', details: [{ field: 'rule', message: 'INV-PRODUCT-002' }], traceId: 't' },
      'fallback',
    );
    expect(error.details).toEqual([{ field: 'rule', message: 'INV-PRODUCT-002' }]);
    expect(error.userMessage).toBe('No se pudo completar la operación.');
  });

  it('never shows a person the text a server wrote for a developer', () => {
    const error = toApiError(500, { error: 'INTERNAL_ERROR', message: 'NullPointerException at Order.java:42', traceId: 't' }, 'f');
    expect(error.userMessage).not.toContain('NullPointer');
  });

  it('works with a body that is not the envelope (a proxy page, an empty body)', () => {
    const error = toApiError(502, '<html>Bad Gateway</html>', 'trace-from-header');
    expect(error.code).toBe('HTTP_502');
    expect(error.traceId).toBe('trace-from-header');
    expect(error.details).toEqual([]);
    expect(error.userMessage).toBe('Ocurrió un error en el servidor. Inténtalo más tarde.');
  });

  it('drops details that are not field errors instead of passing them on', () => {
    const error = toApiError(400, { error: 'VALIDATION_ERROR', message: 'm', details: ['x', { field: 1 }, { field: 'ok', message: 'fine' }], traceId: 't' }, 'f');
    expect(error.details).toEqual([{ field: 'ok', message: 'fine' }]);
  });

  it('falls back to the correlation id of the request when the envelope has no traceId', () => {
    expect(toApiError(500, { error: 'INTERNAL_ERROR', message: 'm' }, 'request-id').traceId).toBe('request-id');
  });
});
