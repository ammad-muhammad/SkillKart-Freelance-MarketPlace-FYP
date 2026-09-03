import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-container">
          <div className="eb-card">
            <AlertTriangle className="eb-icon" size={48} />
            <h1 className="eb-title">Something went wrong</h1>
            <p className="eb-message">
              We encountered an unexpected error. Please try refreshing the page or navigating back home.
            </p>
            <div className="eb-actions">
              <button 
                className="eb-btn eb-btn--primary" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
              <button 
                className="eb-btn eb-btn--outline" 
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="eb-details">
                <summary>Error Details (Dev Only)</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
