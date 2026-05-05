/**
 * Error Boundary Component
 * Catches React render errors and reports them to Sentry
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    console.error('React Error:', error, errorInfo)

    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: true,
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-gray-600 text-center mb-4">
              We're sorry for the inconvenience. An error has been logged and our team has been notified.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 mb-4 overflow-auto max-h-40">
                <p className="font-mono font-bold mb-1">Error Details:</p>
                <p>{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Try Again
              </button>

              <a
                href="/"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded text-center transition-colors"
              >
                Go Home
              </a>
            </div>

            <p className="text-gray-500 text-xs text-center mt-4">
              Error ID: {this.state.error?.toString().substring(0, 20)}...
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
