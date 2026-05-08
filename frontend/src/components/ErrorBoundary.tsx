import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          padding: '20px',
        }}>
          <div style={{
            maxWidth: '500px',
            background: 'var(--surface2)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}>
              ⚠️
            </div>
            
            <h1 style={{
              margin: '0 0 12px',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text)',
            }}>
              Something went wrong
            </h1>
            
            <p style={{
              margin: '0 0 24px',
              fontSize: '0.9rem',
              color: 'var(--text3)',
              lineHeight: 1.6,
            }}>
              The application encountered an unexpected error. Please try refreshing the page.
            </p>

            {this.state.error && (
              <details style={{
                marginBottom: '24px',
                padding: '12px',
                background: 'var(--surface)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text3)',
                textAlign: 'left',
                cursor: 'pointer',
              }}>
                <summary style={{ marginBottom: '8px', fontWeight: 600 }}>
                  Error details
                </summary>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#0a0c10',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
