import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { GridColumn, GridRow } from './WealthGrid'

interface Props {
  columns: GridColumn[]
  rows: GridRow[]
}

type Range = '6M' | '1Y' | 'All'

const formatCr = (val: number) => {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)}Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)}L`
  if (val >= 1e3) return `₹${(val / 1e3).toFixed(0)}K`
  return `₹${val}`
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export default function WealthCharts({ columns, rows }: Props) {
  const [range, setRange] = useState<Range>('1Y')

  const sortedRows = useMemo(() => [...rows].reverse(), [rows]) // oldest first

  const filteredRows = useMemo(() => {
    if (range === 'All') return sortedRows
    const count = range === '6M' ? 6 : 12
    return sortedRows.slice(-count)
  }, [sortedRows, range])

  // Net Worth trend data
  const trendData = filteredRows.map((row) => ({
    month: row.label,
    total: row.total,
  }))

  // Stacked area data per column
  const stackedData = filteredRows.map((row) => {
    const entry: Record<string, number | string> = { month: row.label }
    columns.forEach((col) => { entry[col.id] = row.values[col.id] ?? 0 })
    return entry
  })

  // Monthly change bar data
  const changeData = filteredRows.map((row, i) => {
    const prev = i > 0 ? filteredRows[i - 1].total : null
    const change = prev != null ? row.total - prev : 0
    return { month: row.label, change, positive: change >= 0 }
  }).slice(1)

  // Allocation donut (latest month)
  const latestRow = rows[0]
  const donutData = latestRow
    ? columns
        .map((col) => ({ name: col.label, value: latestRow.values[col.id] ?? 0, color: col.color }))
        .filter((d) => d.value > 0)
    : []

  // Stats
  const stats = useMemo(() => {
    if (sortedRows.length < 2) return null
    const first = sortedRows[0]
    const latest = sortedRows[sortedRows.length - 1]
    const totalGrowth = latest.total - first.total
    const totalGrowthPct = first.total > 0 ? ((totalGrowth / first.total) * 100).toFixed(1) : '0'
    const changes = sortedRows.slice(1).map((row, i) => row.total - sortedRows[i].total)
    const bestMonth = sortedRows[1 + changes.indexOf(Math.max(...changes))]
    const avgMonthly = changes.reduce((a, b) => a + b, 0) / changes.length
    const years = (sortedRows.length - 1) / 12
    const cagr = years > 0 && first.total > 0
      ? ((Math.pow(latest.total / first.total, 1 / years) - 1) * 100).toFixed(1)
      : null

    return { totalGrowth, totalGrowthPct, bestMonth, bestMonthChange: Math.max(...changes), avgMonthly, cagr }
  }, [sortedRows])

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px 20px',
    flex: 1,
    minWidth: '140px',
  }

  const tooltipStyle = {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.8rem',
  }

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', color: 'var(--text3)', gap: '12px' }}>
        <div style={{ fontSize: '2rem' }}>📊</div>
        <div style={{ fontWeight: 600 }}>No data to chart yet</div>
        <div style={{ fontSize: '0.85rem' }}>Add months in the Grid tab to see charts</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Growth</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stats.totalGrowth >= 0 ? '#34d399' : '#ff4d6a' }}>
              {stats.totalGrowth >= 0 ? '+' : ''}{formatINR(stats.totalGrowth)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{stats.totalGrowth >= 0 ? '+' : ''}{stats.totalGrowthPct}% all time</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Month</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>+{formatINR(stats.bestMonthChange)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{stats.bestMonth?.label}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Monthly Growth</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stats.avgMonthly >= 0 ? '#34d399' : '#ff4d6a' }}>
              {stats.avgMonthly >= 0 ? '+' : ''}{formatINR(stats.avgMonthly)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>per month</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CAGR</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{stats.cagr ?? '—'}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>annualized</div>
          </div>
        </div>
      )}

      {/* Chart 1 - Net Worth Trend */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>Net Worth Over Time</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Total portfolio value by month</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['6M', '1Y', 'All'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: range === r ? 'var(--accent)' : 'var(--surface)',
                  color: range === r ? '#0a0c10' : 'var(--text2)',
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
            <YAxis tickFormatter={formatCr} tick={{ fill: 'var(--text3)', fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: number) => [formatINR(val), 'Net Worth']}
            />
            <Area type="monotone" dataKey="total" stroke="#6366f1" fill="url(#totalGrad)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2 - Stacked Area */}
      {columns.length > 0 && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem', marginBottom: '4px' }}>Asset Breakdown Over Time</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '16px' }}>Stacked by asset class</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <YAxis tickFormatter={formatCr} tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: number, name: string) => {
                  const col = columns.find((c) => c.id === name)
                  return [formatINR(val), col?.label || name]
                }}
              />
              <Legend
                formatter={(value) => columns.find((c) => c.id === value)?.label || value}
                wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text2)' }}
              />
              {columns.map((col) => (
                <Area key={col.id} type="monotone" dataKey={col.id} stackId="1" stroke={col.color} fill={col.color} fillOpacity={0.6} strokeWidth={1.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 3 - Monthly Change Bar */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem', marginBottom: '4px' }}>Monthly Change</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '16px' }}>Growth vs previous month</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={changeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
            <YAxis tickFormatter={formatCr} tick={{ fill: 'var(--text3)', fontSize: 11 }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: number) => [formatINR(val), 'Change']}
            />
            <Bar dataKey="change" radius={[3, 3, 0, 0]}>
              {changeData.map((entry, i) => (
                <Cell key={i} fill={entry.positive ? '#34d399' : '#ff4d6a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 4 - Allocation Donut */}
      {donutData.length > 0 && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem', marginBottom: '4px' }}>Current Allocation</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '16px' }}>{latestRow?.label}</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: number, name: string) => [formatINR(val), name]}
              />
              <Legend
                formatter={(value) => value}
                wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text2)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
