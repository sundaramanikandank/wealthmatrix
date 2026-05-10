interface Props {
  hasColumns: boolean
  onManageColumns: () => void
  onImport: () => void
  onAddMonth: () => void
}

export default function WealthEmptyState({ hasColumns, onManageColumns, onImport, onAddMonth }: Props) {
  const btnStyle = (primary = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? 'var(--accent)' : 'var(--surface2)',
    color: primary ? '#0a0c10' : 'var(--text)',
    width: '100%',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
  })

  const stepStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '20px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    flex: 1,
    minWidth: '180px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '32px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          Welcome to Wealth Grid
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
          Track your net worth month by month — just like your Excel sheet, but smarter.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%', maxWidth: '640px' }}>
        {/* Step 1 */}
        <div style={{ ...stepStyle, borderColor: !hasColumns ? 'rgba(0,212,170,0.4)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: !hasColumns ? 'var(--accent)' : 'rgba(52,211,153,0.2)',
              color: !hasColumns ? '#0a0c10' : '#34d399',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
            }}>
              {!hasColumns ? '1' : '✓'}
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Set up columns</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
            Define your asset categories: Savings, MF India, Stocks, Gold, etc.
          </p>
          <button style={btnStyle(!hasColumns)} onClick={onManageColumns}>
            ⚙ Manage Columns
          </button>
        </div>

        {/* Step 2 */}
        <div style={stepStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
              2
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Import existing data</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
            Have months of data in Excel? Import it all at once.
          </p>
          <button style={btnStyle(false)} onClick={onImport}>
            📥 Import from Excel / CSV
          </button>
        </div>

        {/* Step 3 */}
        <div style={stepStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
              3
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Add this month</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
            Start fresh — type in your current values manually.
          </p>
          <button style={btnStyle(false)} onClick={onAddMonth}>
            + Add This Month
          </button>
        </div>
      </div>
    </div>
  )
}
