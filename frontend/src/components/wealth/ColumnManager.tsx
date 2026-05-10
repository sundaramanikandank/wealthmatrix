import { useState, useEffect } from 'react'
import { authFetch } from '../../lib/authFetch'
import { ASSET_TYPE_CONFIG } from '../../data/assetTypes'
import type { AssetType } from '../../data/assetTypes'

interface WealthColumn {
  id: string
  label: string
  asset_type: AssetType | null
  color: string
  sort_order: number
  is_active: boolean
  column_type: 'value' | 'reference'
}

interface Props {
  onClose: () => void
  onUpdate: () => void
}

const PRESET_COLORS = [
  '#0099ff', '#00d4aa', '#ffc848', '#a855f7',
  '#ff4d6a', '#34d399', '#38bdf8', '#f59e0b'
]

export default function ColumnManager({ onClose, onUpdate }: Props) {
  const [columns, setColumns] = useState<WealthColumn[]>([])
  const [newColumnLabel, setNewColumnLabel] = useState('')
  const [newColumnColor, setNewColumnColor] = useState(PRESET_COLORS[0])
  const [newColumnAssetType, setNewColumnAssetType] = useState<AssetType | ''>('')
  const [loading, setLoading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const fetchColumns = async () => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns`)
      if (response.ok) {
        const data = await response.json()
        setColumns(data)
      }
    } catch (error) {
      console.error('Error fetching columns:', error)
    }
  }

  useEffect(() => {
    fetchColumns()
  }, [])

  const handleAddColumn = async () => {
    if (!newColumnLabel.trim()) return

    setLoading(true)
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newColumnLabel.trim(),
          asset_type: newColumnAssetType || null,
          color: newColumnColor,
        }),
      })

      if (response.ok) {
        setNewColumnLabel('')
        setNewColumnAssetType('')
        setNewColumnColor(PRESET_COLORS[0])
        await fetchColumns()
        onUpdate()
      }
    } catch (error) {
      console.error('Error adding column:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateColumn = async (id: string, updates: Partial<WealthColumn>) => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await fetchColumns()
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating column:', error)
    }
  }

  const handleDeleteColumn = async (id: string) => {
    if (!confirm('Hide this column? (You can restore it later)')) return

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchColumns()
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting column:', error)
    }
  }

  const handleRestoreColumn = async (id: string) => {
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (response.ok) {
        await fetchColumns()
        onUpdate()
      }
    } catch (error) {
      console.error('Error restoring column:', error)
    }
  }

  const handlePermanentDelete = async (id: string, label: string) => {
    if (!confirm(`Permanently delete "${label}"?\n\nThis will remove the column AND all its data from every month. This cannot be undone.`)) return

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/api/wealth/columns/${id}/permanent`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchColumns()
        onUpdate()
      }
    } catch (error) {
      console.error('Error permanently deleting column:', error)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newColumns = [...columns]
    const draggedItem = newColumns[draggedIndex]
    newColumns.splice(draggedIndex, 1)
    newColumns.splice(index, 0, draggedItem)

    setColumns(newColumns)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    // Update sort_order for all columns
    const updates = columns.map((col, index) => ({
      id: col.id,
      sort_order: index,
    }))

    for (const update of updates) {
      await handleUpdateColumn(update.id, { sort_order: update.sort_order })
    }

    setDraggedIndex(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Manage Columns
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Current Columns */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>
            Current Columns
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {columns.filter((c) => c.is_active !== false).map((column) => {
              const realIndex = columns.indexOf(column)
              return (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(realIndex)}
                onDragOver={(e) => handleDragOver(e, realIndex)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'grab',
                }}
              >
                <span style={{ color: 'var(--text3)', fontSize: '1.2rem' }}>≡</span>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: column.color,
                    flexShrink: 0,
                  }}
                />
                <input
                  type="text"
                  value={column.label}
                  onChange={(e) => handleUpdateColumn(column.id, { label: e.target.value })}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleUpdateColumn(column.id, { column_type: column.column_type === 'reference' ? 'value' : 'reference' })}
                    title={column.column_type === 'reference' ? 'Reference data — excluded from total' : 'Included in net worth total'}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: column.column_type === 'reference' ? 'rgba(255,200,72,0.15)' : 'rgba(0,212,170,0.12)',
                      color: column.column_type === 'reference' ? '#ffc848' : '#00d4aa',
                    }}
                  >
                    {column.column_type === 'reference' ? 'REF' : 'VALUE'}
                  </button>
                  <button
                    onClick={() => handleDeleteColumn(column.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text3)',
                      cursor: 'pointer',
                    }}
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(column.id, column.label)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      background: 'rgba(255,77,106,0.1)',
                      border: '1px solid rgba(255,77,106,0.3)',
                      borderRadius: '4px',
                      color: '#ff4d6a',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )})}
          </div>

          {/* Hidden Columns */}
          {columns.some((c) => c.is_active === false) && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text3)', marginBottom: '10px' }}>
                Hidden Columns
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {columns.filter((c) => c.is_active === false).map((column) => (
                  <div
                    key={column.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      opacity: 0.6,
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: column.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text2)' }}>{column.label}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleRestoreColumn(column.id)}
                        style={{
                          padding: '4px 10px', fontSize: '0.75rem',
                          background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                          borderRadius: '4px', color: 'var(--accent)', cursor: 'pointer',
                        }}
                      >
                        Show
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(column.id, column.label)}
                        style={{
                          padding: '4px 10px', fontSize: '0.75rem',
                          background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)',
                          borderRadius: '4px', color: '#ff4d6a', cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Column */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>
              Add New Column
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Column name (e.g., MF India, Savings)"
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />

              <select
                value={newColumnAssetType}
                onChange={(e) => setNewColumnAssetType(e.target.value as AssetType | '')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">Custom (no asset type)</option>
                <option disabled>── Asset Types ──</option>
                {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '8px' }}>Color</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        border: newColumnColor === color ? '3px solid var(--accent)' : '2px solid var(--border)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', padding: '8px 10px', background: 'var(--surface2)', borderRadius: '6px', lineHeight: 1.5 }}>
                💡 Use <strong>REF</strong> type for forex rates, price references, or notes that should not add to your net worth total.
              </div>

              <button
                onClick={handleAddColumn}
                disabled={loading || !newColumnLabel.trim()}
                style={{
                  padding: '10px 16px',
                  background: 'var(--accent)',
                  color: '#0a0c10',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading || !newColumnLabel.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !newColumnLabel.trim() ? 0.5 : 1,
                }}
              >
                {loading ? 'Adding...' : 'Add Column'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
