import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Orbit caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '32px', color: '#ef4444' }}>
              error
            </span>
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#f1f5f9',
            marginBottom: '8px',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            maxWidth: '300px',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}>
            An unexpected error occurred.
            Try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
            Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
