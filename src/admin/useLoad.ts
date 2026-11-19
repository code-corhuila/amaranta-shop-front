import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../core/http/apiError';

export type LoadState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'success'; readonly data: T };

/**
 * Runs one request per `key` and gives the screen the state to draw. A newer request replaces the older one: the older is
 * cancelled when the key changes or the screen goes away, and an answer that arrives after that is ignored.
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (failure: unknown) => {
        if (controller.signal.aborted) return;
        // What a person reads is decided by the status, never by what a service wrote (see apiError.ts).
        setState({ status: 'error', message: failure instanceof ApiError ? failure.userMessage : 'Ocurrió un error. Inténtalo de nuevo.' });
      },
    );
    return () => controller.abort();
    // `load` is a new function on every render; the key is what says the request is a different one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
