import { Component, type ReactNode } from 'react';

interface Props {
  /** What the person calls the portal, for the notice. */
  readonly name: string;
  readonly onRetry: () => void;
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * One boundary per portal (Annex H). When a portal cannot be loaded, or breaks while it draws, only its own area says
 * so; the navigation and every other portal keep working. Without it, one portal that is down leaves the whole
 * application blank.
 */
export class RemoteBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    // The technical reason goes to the console (and so to whoever collects it); the person gets the notice below.
    console.error(`the portal "${this.props.name}" failed`, error);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert">
        <p>El módulo {this.props.name} no está disponible. Inténtalo de nuevo en un momento.</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onRetry();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}
