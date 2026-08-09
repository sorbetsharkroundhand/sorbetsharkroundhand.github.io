import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ManimErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: unknown;
}

interface ManimErrorBoundaryState {
  hasError: boolean;
}

export class ManimErrorBoundary extends Component<
  ManimErrorBoundaryProps,
  ManimErrorBoundaryState
> {
  state: ManimErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ManimErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // The fallback keeps the article readable when a visualization render fails.
  }

  componentDidUpdate(previousProps: ManimErrorBoundaryProps): void {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
