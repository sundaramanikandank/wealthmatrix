import { useState } from 'react'
import { authFetch } from '../../lib/authFetch'

const API = import.meta.env.VITE_API_BASE_URL

interface Props {
  onDone: () => void
}

const PALETTE = [
  '#00d4aa', '#6366f1', '#f59e0b', '#ec4899',
  '#10b981', '#3b82f6', '#f97316', '#8b5cf6',
  '#14b8a6', '#ef4444',
]

const DEFAULTS = [
  { label: 'Savings Account', checked: true },
  { label: 'MF India', checked: true },
  { label: 'India Stocks', checked: true },
  { label: 'US Stocks', checked: true },
  { label: 'Gold', checked: true },
  { label: 'NPS', checked: true },
  { label: 'NCD', checked: false },
  { label: 'Foreign Bank', checked: false },
  { label: 'Other', checked: false },
]

export default function OnboardingColumns({ onDone }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULTS.map((d) => [d.label, d.checked]))
  )
  const [saving, setSaving] = useState(false)
  const [customLabel, setCustomLabel] = useState('')

  const toggle = (label: string) =>
    setSelected((prev) => ({ ...prev, [label]: !prev[label] }))

  const addCustom = () => {
    const l = customLabel.trim()
    if (!l) return
    setSelected((prev) => ({ ...prev, [l]: true }))
    setCustomLabel('')
  }

  const handleCreate = async () => {
    const toCreate = Object.entries(selected).filter(([, v]) => v).map(([label], i) => ({ label, color: PALETTE[i % PALETTE.length] }))
    if (toCreate.length === 0) { onDone(); return }

    setSaving(true)
    try {
      await Promise.all(
        toCreate.map((col, i) =>
          authFetch(`${API}/api/wealth/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: col.label, color: col.color, sort_order: i }),
          })
        )
      )
      onDone()
    } catch (err) {
      console.error('Error creating columns:', err)
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const allLabels = [
    ...DEFAULTS.map((d) => d.label),
    ...Object.keys(selected).filter((k) => !DEFAULTS.find((d) => d.label === k)),
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏗</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Set up your columns</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.85rem', margin: 0 }}>
            Pick the asset categories you track. You can add more later.
          </p>
        </div>

        {/* Checklist */}
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allLabels.map((label, i) => {
            const checked = selected[label] ?? false
            const color = PALETTE[i % PALETTE.length]
            return (
              <label
                key={label}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: checked ? 'rgba(0,212,170,0.06)' : 'transparent', border: `1px solid ${checked ? 'rgba(0,212,170,0.25)' : 'var(--border)'}`, transition: 'all 0.15s' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(label)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: checked ? 600 : 400 }}>{label}</span>
              </label>
            )
          })}
        </div>

        {/* Add custom */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Add custom column..."
            style={{ flex: 1, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.85rem' }}
          />
          <button
            onClick={addCustom}
            style={{ padding: '8px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Add
          </button>
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 24px 24px' }}>
          <button
            onClick={handleCreate}
            disabled={saving || selectedCount === 0}
            style={{ width: '100%', padding: '12px', background: selectedCount > 0 ? 'var(--accent)' : 'var(--surface2)', border: 'none', borderRadius: '8px', color: selectedCount > 0 ? '#0a0c10' : 'var(--text3)', fontWeight: 700, fontSize: '0.95rem', cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
          >
            {saving ? 'Creating...' : `Add ${selectedCount} Column${selectedCount !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={onDone}
            style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'none', border: 'none', color: 'var(--text3)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Skip — I'll set up columns manually
          </button>
        </div>
      </div>
    </div>
  )
}
