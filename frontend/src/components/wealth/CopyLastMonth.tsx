import { useState } from 'react'
import { authFetch } from '../../lib/authFetch'
import type { GridColumn, GridRow } from './WealthGrid'

const API = import.meta.env.VITE_API_BASE_URL

interface Props {
  columns: GridColumn[]
  rows: GridRow[]
  onClose: () => void
  onSaved: () => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const formatRaw = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 4 })

function nextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const d = new Date(year, month, 1) // month is 0-indexed so this gives next month
  return d.toISOString().substring(0, 7)
}

function monthLabel(monthStr: string): string {
  const d = new Date(`${monthStr}-01`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function CopyLastMonth({ columns, rows, onClose, onSaved }: Props) {
  const prevRow = rows[0] // most recent (rows are newest-first)
  const targetMonth = prevRow ? nextMonth(prevRow.month) : new Date().toISOString().substring(0, 7)
  const alreadyExists = rows.some((r) => r.month === targetMonth)

  const [values, setValues] = useState<Record<string, number>>(
    prevRow ? { ...prevRow.values } : {}
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const valueColIds = new Set(columns.filter((c) => c.column_type !== 'reference').map((c) => c.id))
  const total = Object.entries(values).reduce((s, [k, v]) => valueColIds.has(k) ? s + (Number(v) || 0) : s, 0)
  const prevTotal = prevRow?.total ?? 0
  const diff = total - prevTotal
  const sign = diff >= 0 ? '+' : ''

  const handleSave = async () => {
    setSaving(true)
    try {
      await authFetch(`${API}/api/wealth/grid/row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: targetMonth, values, notes: notes || null }),
      })
      onSaved()
      onClose()
    } catch (err) {
      console.error('Error saving copied month:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!prevRow) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
        onClick={onClose}
      >
        <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '32px', maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📅</div>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>No previous month to copy</div>
          <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>Add your first month manually using "Add Month".</div>
          <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#0a0c10', fontWeight: 700, cursor: 'pointer' }}>OK</button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '620px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Add {monthLabel(targetMonth)}
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '2px' }}>
              Copied from {monthLabel(prevRow.month)} — edit what changed
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {alreadyExists && (
          <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#ffc848' }}>
            ⚠ {monthLabel(targetMonth)} already has data — saving will overwrite it.
          </div>
        )}

        {/* Table */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text2)', fontWeight: 700, minWidth: '120px' }}>Column</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text2)', fontWeight: 700, minWidth: '130px' }}>{monthLabel(prevRow.month)}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent)', fontWeight: 700, minWidth: '150px' }}>{monthLabel(targetMonth)} ✏</th>
                </tr>
              </thead>
              <tbody>
                {/* VALUE columns */}
                {columns.filter((c) => c.column_type !== 'reference').map((col) => {
                  const prev = prevRow.values[col.id] ?? 0
                  const curr = values[col.id] ?? 0
                  const changed = curr !== prev
                  return (
                    <tr key={col.id} style={{ borderBottom: '1px solid var(--border)', background: changed ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                      <td style={{ padding: '8px 14px', color: 'var(--text)', fontWeight: 600 }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: col.color, marginRight: '8px' }} />
                        {col.label}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>
                        {formatINR(prev)}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <input type="number" value={curr || ''} onChange={(e) => setValues({ ...values, [col.id]: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '6px 10px', background: changed ? 'rgba(99,102,241,0.1)' : 'var(--surface2)', border: changed ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
                        />
                      </td>
                    </tr>
                  )
                })}
                {/* Total row */}
                <tr style={{ background: 'rgba(0,212,170,0.05)', borderTop: '2px solid rgba(0,212,170,0.2)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--accent)' }}>Total</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)', fontWeight: 600 }}>{formatINR(prevTotal)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 700 }}>
                    {formatINR(total)}
                    {diff !== 0 && (
                      <span style={{ fontSize: '0.7rem', color: diff >= 0 ? '#34d399' : '#ff4d6a', marginLeft: '6px' }}>
                        {sign}{formatINR(Math.abs(diff))}
                      </span>
                    )}
                  </td>
                </tr>
                {/* REF columns divider + rows */}
                {columns.some((c) => c.column_type === 'reference') && (
                  <tr>
                    <td colSpan={3} style={{ padding: '10px 14px 4px', fontSize: '0.72rem', color: '#ffc848', fontWeight: 600, letterSpacing: '0.06em', borderTop: '1px dashed rgba(255,200,72,0.3)', background: 'rgba(255,200,72,0.04)' }}>
                      📌 REFERENCE VALUES — not included in total
                    </td>
                  </tr>
                )}
                {columns.filter((c) => c.column_type === 'reference').map((col) => {
                  const prev = prevRow.values[col.id] ?? 0
                  const curr = values[col.id] ?? 0
                  const changed = curr !== prev
                  return (
                    <tr key={col.id} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,200,72,0.03)', opacity: 0.85 }}>
                      <td style={{ padding: '8px 14px', color: '#ffc848', fontWeight: 600, fontStyle: 'italic' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: col.color, marginRight: '8px' }} />
                        {col.label}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)' }}>
                        {formatRaw(prev)}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                        <input type="number" value={curr || ''} onChange={(e) => setValues({ ...values, [col.id]: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', padding: '6px 10px', background: changed ? 'rgba(255,200,72,0.08)' : 'var(--surface2)', border: changed ? '1px solid rgba(255,200,72,0.4)' : '1px solid var(--border)', borderRadius: '6px', color: '#ffc848', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Bonus received, SIP increased..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#0a0c10', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : `Save ${monthLabel(targetMonth)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
