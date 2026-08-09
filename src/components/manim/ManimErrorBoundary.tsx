import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ManimErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
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

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
