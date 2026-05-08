interface Props {
  timestamp?: string
  onDismiss?: () => void
}

export default function StaleDataBanner({ timestamp, onDismiss }: Props) {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : ''

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      left: 0,
      right: 0,
      zIndex: 40,
      background: 'var(--yellow)',
      color: '#0a0c10',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Market is closed. Showing last updated data
          {formattedTime && ` (${formattedTime})`}
        </span>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '0.85rem',
            background: 'rgba(0,0,0,0.1)',
            color: '#0a0c10',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
