import React from 'react';
import { AlertCircle, RotateCcw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleCopy = () => {
    if (this.state.error) {
      const text = `${this.state.error.toString()}\n\n${this.state.errorInfo?.componentStack || ''}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="sk-error-container">
          <div className="sk-error-card">
            {/* Header with compact badge & title */}
            <div className="sk-error-header">
              <div className="sk-error-icon-box">
                <AlertCircle size={20} />
              </div>
              <div className="sk-error-text">
                <h3 className="sk-error-title">Something went wrong</h3>
                <p className="sk-error-subtitle">
                  An unexpected error occurred while rendering this section.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="sk-error-actions">
              <button
                type="button"
                className="sk-error-btn sk-error-btn--primary"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={14} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                className="sk-error-btn sk-error-btn--secondary"
                onClick={() => (window.location.href = '/')}
              >
                <Home size={14} />
                <span>Go Home</span>
              </button>
            </div>

            {/* Collapsible developer trace */}
            {import.meta.env.DEV && this.state.error && (
              <div className="sk-error-details-wrap">
                <button
                  type="button"
                  className="sk-error-details-toggle"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                >
                  <span>{this.state.showDetails ? 'Hide error details' : 'Show error details'}</span>
                  {this.state.showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {this.state.showDetails && (
                  <div className="sk-error-details-body">
                    <div className="sk-error-details-top">
                      <span className="sk-error-details-tag">Developer Trace</span>
                      <button
                        type="button"
                        className="sk-error-copy-btn"
                        onClick={this.handleCopy}
                        title="Copy error trace"
                      >
                        {this.state.copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                        <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="sk-error-msg">{this.state.error.toString()}</div>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="sk-error-stack">{this.state.errorInfo.componentStack}</pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

