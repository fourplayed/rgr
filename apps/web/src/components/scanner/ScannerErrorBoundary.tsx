import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScannerErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  fallbackMessage?: string;
}

interface ScannerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for scanner components
 * Catches errors from QR scanner (camera access, library issues, etc.)
 * and displays a user-friendly error message instead of crashing
 */
export default class ScannerErrorBoundary extends Component<
  ScannerErrorBoundaryProps,
  ScannerErrorBoundaryState
> {
  constructor(props: ScannerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ScannerErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('Scanner error caught by boundary:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const message = this.props.fallbackMessage || 'Camera error - please refresh';

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg min-h-[300px]">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Scanner Error
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4 max-w-xs">{message}</p>
          {this.state.error && (
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mb-4 max-w-xs font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            {this.props.onRetry && (
              <Button variant="secondary" onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button onClick={this.handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
