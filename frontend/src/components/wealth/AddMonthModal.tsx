import { useState } from 'react'
import { authFetch } from '../../lib/authFetch'
import type { GridColumn } from './WealthGrid'

const API = import.meta.env.VITE_API_BASE_URL

interface Props {
  columns: GridColumn[]
  existingMonths: string[]
  onClose: () => void
  onSaved: () => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

function generateAvailableMonths(existing: string[]): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.toISOString().substring(0, 7)
    if (!existing.includes(value)) {
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      months.push({ value, label })
    }
  }
  return months
}

export default function AddMonthModal({ columns, existingMonths, onClose, onSaved }: Props) {
  const availableMonths = generateAvailableMonths(existingMonths)
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]?.value || '')
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')
  const [values, setValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)

  const total = Object.values(values).reduce((sum, v) => sum + (v || 0), 0)

  const handleAutoCalc = async () => {
    setAutoLoading(true)
    try {
      const res = await authFetch(`${API}/api/wealth/grid/autocalc?month=${selectedMonth}`)
      if (res.ok) {
        const data = await res.json()
        setValues(data)
        setMode('auto')
      }
    } catch (error) {
      console.error('Error auto-calculating:', error)
    } finally {
      setAutoLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedMonth) return
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/wealth/grid/row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          values,
          auto_calculated: mode === 'auto',
        }),
      })
      if (res.ok) {
        onSaved()
        onClose()
      }
    } catch (error) {
      console.error('Error saving row:', error)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    fontSize: '0.85rem',
    textAlign: 'right',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', maxWidth: '500px', width: '100%',
          maxHeight: '85vh', overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Add Month</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Month selector */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ ...inputStyle, textAlign: 'left' }}
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {availableMonths.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '4px' }}>All available months already have data.</div>
            )}
          </div>

          {/* Auto-fill button */}
          <button
            onClick={handleAutoCalc}
            disabled={autoLoading || !selectedMonth}
            style={{
              padding: '10px 16px', background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.3)', borderRadius: '8px',
              color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            {autoLoading ? '⏳ Calculating from assets...' : '↻ Auto-calculate from my assets'}
          </button>

          {/* Column value inputs */}
          {columns.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600 }}>Enter Values (₹)</div>
              {columns.map((col) => (
                <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{col.label}</span>
                  </div>
                  <input
                    type="number"
                    value={values[col.id] || ''}
                    onChange={(e) => setValues({ ...values, [col.id]: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Total preview */}
          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,212,170,0.08)', borderRadius: '8px', border: '1px solid rgba(0,212,170,0.2)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Total Net Worth</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{formatINR(total)}</span>
            </div>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedMonth || availableMonths.length === 0}
              style={{
                flex: 2, padding: '10px', background: 'var(--accent)', border: 'none',
                borderRadius: '8px', color: '#0a0c10', fontWeight: 700, fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Save Month'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
