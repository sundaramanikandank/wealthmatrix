export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `${size / 8}px solid var(--border)`,
        borderTop: `${size / 8}px solid var(--accent)`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '12px 8px', borderBottom: '2px solid var(--border)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '16px',
              background: 'var(--surface)',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '8px',
            padding: '12px 8px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                flex: 1,
                height: '20px',
                background: 'var(--surface)',
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div style={{
      width: '100%',
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      borderRadius: '8px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <LoadingSpinner size={40} />
        <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text3)' }}>
          Loading chart data...
        </p>
      </div>
    </div>
  )
}
