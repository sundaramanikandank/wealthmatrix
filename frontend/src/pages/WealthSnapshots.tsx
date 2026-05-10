import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../lib/authFetch'
import WealthCharts from '../components/wealth/WealthCharts'
import WealthGrid from '../components/wealth/WealthGrid'
import ColumnManager from '../components/wealth/ColumnManager'
import AddMonthModal from '../components/wealth/AddMonthModal'
import ImportExcel from '../components/wealth/ImportExcel'
import CopyLastMonth from '../components/wealth/CopyLastMonth'
import WealthEmptyState from '../components/wealth/WealthEmptyState'
import OnboardingColumns from '../components/wealth/OnboardingColumns'
import type { GridColumn, GridRow } from '../components/wealth/WealthGrid'

const API = import.meta.env.VITE_API_BASE_URL
type Tab = 'charts' | 'grid'

export default function WealthSnapshots() {
  const [tab, setTab] = useState<Tab>('grid')
  const [columns, setColumns] = useState<GridColumn[]>([])
  const [rows, setRows] = useState<GridRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showChanges, setShowChanges] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showAddMonth, setShowAddMonth] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCopyLast, setShowCopyLast] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const fetchGrid = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/wealth/grid`)
      if (res.ok) {
        const data = await res.json()
        setColumns(data.columns || [])
        setRows(data.rows || [])
      }
    } catch (error) {
      console.error('Error fetching grid:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGrid() }, [fetchGrid])

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${rows.length} months of data? This cannot be undone.`)) return
    try {
      await authFetch(`${API}/api/wealth/grid/rows`, { method: 'DELETE' })
      fetchGrid()
    } catch (error) {
      console.error('Error deleting all rows:', error)
    }
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface2)',
    color: active ? '#0a0c10' : 'var(--text2)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '7px',
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text2)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '80px 20px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Wealth Grid</h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text3)', marginTop: '4px' }}>
            {columns.length} columns · {rows.length} months
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnStyle(tab === 'charts')} onClick={() => setTab('charts')}>📊 Charts</button>
          <button style={btnStyle(tab === 'grid')} onClick={() => setTab('grid')}>📋 Grid</button>
        </div>
      </div>

      {/* Grid toolbar (only in grid tab, only when data exists) */}
      {tab === 'grid' && (rows.length > 0 || columns.length > 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={toolbarBtnStyle} onClick={() => setShowAddMonth(true)}>+ Add Month</button>
            <button style={toolbarBtnStyle} onClick={() => setShowCopyLast(true)}>⎘ Copy Last Month</button>
            <button
              style={{ ...toolbarBtnStyle, color: 'var(--accent)', borderColor: 'rgba(0,212,170,0.3)' }}
              onClick={() => setShowChanges(!showChanges)}
            >
              {showChanges ? '▾ Hide Δ' : '▸ Show Δ'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={toolbarBtnStyle} onClick={() => setShowColumnManager(true)}>⚙ Columns</button>
            <button style={toolbarBtnStyle} onClick={() => setShowImport(true)}>↑ Import</button>
            {rows.length > 0 && (
              <button
                style={{ ...toolbarBtnStyle, color: '#ff4d6a', borderColor: 'rgba(255,77,106,0.3)' }}
                onClick={handleDeleteAll}
              >
                🗑 Delete All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: tab === 'grid' && rows.length === 0 && !loading ? '0' : '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text3)' }}>
            Loading wealth data...
          </div>
        ) : tab === 'charts' ? (
          <WealthCharts columns={columns} rows={rows} />
        ) : rows.length === 0 ? (
          <WealthEmptyState
            hasColumns={columns.length > 0}
            onManageColumns={() => columns.length === 0 ? setShowOnboarding(true) : setShowColumnManager(true)}
            onImport={() => setShowImport(true)}
            onAddMonth={() => setShowAddMonth(true)}
          />
        ) : (
          <WealthGrid
            columns={columns}
            rows={rows}
            showChanges={showChanges}
            onDataChange={fetchGrid}
          />
        )}
      </div>

      {/* Modals */}
      {showColumnManager && (
        <ColumnManager onClose={() => setShowColumnManager(false)} onUpdate={fetchGrid} />
      )}
      {showOnboarding && (
        <OnboardingColumns onDone={() => { setShowOnboarding(false); fetchGrid() }} />
      )}
      {showAddMonth && (
        <AddMonthModal
          columns={columns}
          existingMonths={rows.map((r) => r.month)}
          onClose={() => setShowAddMonth(false)}
          onSaved={fetchGrid}
        />
      )}
      {showCopyLast && (
        <CopyLastMonth
          columns={columns}
          rows={rows}
          onClose={() => setShowCopyLast(false)}
          onSaved={fetchGrid}
        />
      )}
      {showImport && (
        <ImportExcel
          columns={columns}
          onClose={() => setShowImport(false)}
          onImported={fetchGrid}
        />
      )}
    </div>
  )
}
