/**
 * ErrorBoundary - Catches render errors and displays a glassmorphic fallback UI
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Or via the HOC:
 *   export default withErrorBoundary(MyComponent);
 */
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl text-center"
          style={{
            background: 'rgba(6, 11, 40, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minHeight: '200px',
          }}
        >
          <p
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Something went wrong
          </p>
          {this.state.error && (
            <p className="text-sm text-slate-400 max-w-md break-words">
              {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/15"
            style={{
              background: 'rgba(59, 130, 246, 0.3)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC that wraps a component in an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}
