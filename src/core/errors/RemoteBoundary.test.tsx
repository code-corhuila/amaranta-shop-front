import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteBoundary } from './RemoteBoundary';

function Broken(): never {
  throw new Error('remoteEntry.js could not be loaded');
}

describe('RemoteBoundary', () => {
  // React logs every error it catches; the tests that throw on purpose would fill the output with it.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('shows what is inside while it works', () => {
    render(
      <RemoteBoundary name="Catálogo" onRetry={() => undefined}>
        <p>Productos</p>
      </RemoteBoundary>,
    );
    expect(screen.getByText('Productos')).toBeInTheDocument();
  });

  it('replaces only its own area with a notice when what is inside fails', () => {
    render(
      <div>
        <p>Menú del contenedor</p>
        <RemoteBoundary name="Catálogo" onRetry={() => undefined}>
          <Broken />
        </RemoteBoundary>
      </div>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('El módulo Catálogo no está disponible');
    expect(screen.getByText('Menú del contenedor')).toBeInTheDocument();
  });

  it('does not show a person the technical reason', () => {
    render(
      <RemoteBoundary name="Catálogo" onRetry={() => undefined}>
        <Broken />
      </RemoteBoundary>,
    );
    expect(screen.queryByText(/remoteEntry/)).not.toBeInTheDocument();
  });

  it('offers to try again, and says so to whoever asked', async () => {
    const onRetry = vi.fn();
    render(
      <RemoteBoundary name="Catálogo" onRetry={onRetry}>
        <Broken />
      </RemoteBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
