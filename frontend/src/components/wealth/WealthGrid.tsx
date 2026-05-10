import { useCallback } from 'react'
import GridCell from './GridCell'
import { authFetch } from '../../lib/authFetch'

const API = import.meta.env.VITE_API_BASE_URL

export interface GridColumn {
  id: string
  label: string
  color: string
  asset_type: string | null
  column_type: 'value' | 'reference'
}

export interface GridRow {
  month: string
  label: string
  values: Record<string, number>
  total: number
  auto_calculated: boolean
  notes: string
  manually_overridden: Record<string, boolean>
}

interface Props {
  columns: GridColumn[]
  rows: GridRow[]
  showChanges: boolean
  onDataChange: () => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const formatChange = (current: number, previous: number) => {
  const diff = current - previous
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : null
  const sign = diff >= 0 ? '+' : ''
  return { diff, pct, sign }
}

const currentMonth = new Date().toISOString().substring(0, 7)


export default function WealthGrid({ columns, rows, showChanges, onDataChange }: Props) {
  // Only show columns that have at least one non-zero value across all rows
  const activeColumns = columns.filter((col) =>
    rows.some((row) => row.values[col.id] != null && Number(row.values[col.id]) !== 0)
  )

  const handleDeleteRow = useCallback(async (month: string, label: string) => {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return
    try {
      await authFetch(`${API}/api/wealth/grid/row/${month}`, { method: 'DELETE' })
      onDataChange()
    } catch (error) {
      console.error('Error deleting row:', error)
    }
  }, [onDataChange])

  const handleCellSave = useCallback(async (month: string, columnId: string, value: number) => {
    try {
      await authFetch(`${API}/api/wealth/grid/cell`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, column_id: columnId, value }),
      })
      onDataChange()
    } catch (error) {
      console.error('Error saving cell:', error)
    }
  }, [onDataChange])

  const handleExportCSV = () => {
    const headers = ['Month', ...activeColumns.map((c) => c.label), 'Total']
    const csvRows = rows.map((row) => [
      row.label,
      ...activeColumns.map((c) => row.values[c.id] ?? 0),
      row.total,
    ])
    const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wealthmatrix_grid_export_${currentMonth}.csv`
    a.click()
  }

  if (activeColumns.length === 0 && rows.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text3)',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '2rem' }}>📋</div>
        <div style={{ fontWeight: 600 }}>No columns configured</div>
        <div style={{ fontSize: '0.85rem' }}>Use "Manage Columns" to add asset categories</div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text3)',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '2rem' }}>📅</div>
        <div style={{ fontWeight: 600 }}>No data yet</div>
        <div style={{ fontSize: '0.85rem' }}>Click "Add Month" to add your first month of data</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: 'var(--text3)' }}>
        <span>● <span style={{ color: '#00d4aa' }}>●</span> Auto-calculated</span>
        <span>● <span style={{ color: '#ffc848' }}>●</span> Manually entered</span>
      </div>

      {/* Scrollable Table */}
      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: '0.78rem',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
              {/* Month header - sticky left */}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  color: 'var(--text2)',
                  minWidth: '100px',
                  position: 'sticky',
                  left: 0,
                  background: 'var(--surface2)',
                  zIndex: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                Month
              </th>

              {/* Column headers with color dots */}
              {activeColumns.map((col) => {
                const isRef = col.column_type === 'reference'
                return (
                  <th
                    key={col.id}
                    title={isRef ? 'Reference column — not included in total' : undefined}
                    style={{
                      padding: '10px 10px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: isRef ? '#ffc848' : 'var(--text2)',
                      minWidth: '100px',
                      whiteSpace: 'nowrap',
                      fontStyle: isRef ? 'italic' : 'normal',
                      borderBottom: isRef ? '2px solid rgba(255,200,72,0.35)' : undefined,
                    }}
                  >
                    {isRef && <span style={{ marginRight: '4px', fontSize: '0.75em' }}>📌</span>}
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: col.color, marginRight: '6px' }} />
                    {col.label}
                  </th>
                )
              })}

              {/* Total header - sticky right */}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  minWidth: '110px',
                  position: 'sticky',
                  right: 0,
                  background: 'var(--surface2)',
                  zIndex: 2,
                  borderLeft: '1px solid rgba(0,212,170,0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                Total ₹
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => {
              const prevRow = rows[rowIndex + 1]

              return (
                <>
                  {/* Data row */}
                  <tr
                    key={row.month}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    {/* Month label - sticky left */}
                    <td
                      style={{
                        padding: '8px 12px',
                        position: 'sticky',
                        left: 0,
                        background: rowIndex % 2 === 0 ? 'var(--surface)' : 'var(--surface)',
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.82rem' }}>{row.label}</span>
                        <button
                          onClick={() => handleDeleteRow(row.month, row.label)}
                          title="Delete this month"
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '0.75rem', padding: '1px 4px', borderRadius: '3px', lineHeight: 1, opacity: 0.4, transition: 'opacity 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
                        >
                          ✕
                        </button>
                      </div>
                      {row.month === currentMonth && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: 'rgba(0,212,170,0.15)',
                            color: 'var(--accent)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          Current
                        </span>
                      )}
                      {row.auto_calculated && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            marginLeft: '4px',
                          }}
                        >
                          ↻ Auto
                        </span>
                      )}
                    </td>

                    {/* Data cells */}
                    {activeColumns.map((col) => (
                      <GridCell
                        key={col.id}
                        value={row.values[col.id] ?? null}
                        isEditable={true}
                        isReference={col.column_type === 'reference'}
                        isAutoCalc={row.auto_calculated}
                        isManualOverride={row.manually_overridden?.[col.id] === true}
                        onSave={(val) => handleCellSave(row.month, col.id, val)}
                        onTab={() => {}}
                        onShiftTab={() => {}}
                      />
                    ))}

                    {/* Total - sticky right */}
                    <GridCell
                      key={`${row.month}-total`}
                      value={row.total}
                      isEditable={false}
                      isTotal={true}
                      onSave={() => {}}
                    />
                  </tr>

                  {/* Change subrow */}
                  {showChanges && prevRow && (
                    <tr
                      key={`${row.month}-change`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        style={{
                          padding: '3px 12px',
                          position: 'sticky',
                          left: 0,
                          background: 'var(--surface)',
                          zIndex: 1,
                          fontSize: '0.7rem',
                          color: 'var(--text3)',
                        }}
                      >
                        vs prev
                      </td>

                      {activeColumns.map((col) => {
                        const curr = row.values[col.id] ?? 0
                        const prev = prevRow.values[col.id] ?? 0
                        const { diff, pct, sign } = formatChange(curr, prev)
                        const isRef = col.column_type === 'reference'
                        if (curr === 0 && prev === 0) {
                          return <td key={col.id} style={{ padding: '3px 10px', textAlign: 'right' }}><span style={{ color: 'var(--text3)' }}>—</span></td>
                        }
                        if (isRef) {
                          return (
                            <td key={col.id} style={{ padding: '3px 10px', textAlign: 'right', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                              {prev.toLocaleString()} → {curr.toLocaleString()}
                              {diff !== 0 && <span style={{ marginLeft: '4px', opacity: 0.7 }}>({sign}{Math.abs(diff).toLocaleString()})</span>}
                            </td>
                          )
                        }
                        return (
                          <td
                            key={col.id}
                            style={{
                              padding: '3px 10px',
                              textAlign: 'right',
                              fontSize: '0.7rem',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: diff >= 0 ? '#34d399' : '#ff4d6a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sign}{formatINR(Math.abs(diff))}
                            {pct && <span style={{ opacity: 0.7 }}> ({sign}{pct}%)</span>}
                          </td>
                        )
                      })}

                      {/* Total change */}
                      {(() => {
                        const { diff, pct, sign } = formatChange(row.total, prevRow.total)
                        return (
                          <td
                            style={{
                              padding: '3px 12px',
                              textAlign: 'right',
                              fontSize: '0.7rem',
                              fontFamily: 'JetBrains Mono, monospace',
                              color: diff >= 0 ? '#34d399' : '#ff4d6a',
                              position: 'sticky',
                              right: 0,
                              background: 'var(--surface)',
                              borderLeft: '1px solid rgba(0,212,170,0.2)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sign}{formatINR(Math.abs(diff))}
                            {pct && <span style={{ opacity: 0.7 }}> ({sign}{pct}%)</span>}
                          </td>
                        )
                      })()}
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
