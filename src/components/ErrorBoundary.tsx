import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: Initialize state as a class property to fix type errors.
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError('ErrorBoundary caught an error', { error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-lg">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h1>
                <p className="text-gray-600 mb-4">
                    An unexpected error occurred. Please try refreshing the page. If the problem persists, please contact support.
                </p>
                <details className="bg-gray-100 p-3 rounded text-left text-sm text-gray-700">
                    <summary className="cursor-pointer font-medium">Error Details</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words">
                        <code>
                            {this.state.error?.toString()}
                        </code>
                    </pre>
                </details>
                 <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;