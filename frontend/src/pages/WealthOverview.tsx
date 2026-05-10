import { useEffect, useState, useCallback } from 'react'
import { authFetch } from '../lib/authFetch'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts'
import type { GridColumn, GridRow } from '../components/wealth/WealthGrid'

const API = import.meta.env.VITE_API_BASE_URL

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const formatINRShort = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const fmtMon = (month: string) =>
  new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

type TimeRange = '6M' | '1Y' | 'ALL'

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

export default function WealthOverview() {
  const [columns, setColumns] = useState<GridColumn[]>([])
  const [rows, setRows] = useState<GridRow[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const vw = useWindowWidth()
  const isMobile = vw < 768

  const fetchGrid = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/wealth/grid`)
      if (res.ok) {
        const data = await res.json()
        setColumns(data.columns || [])
        setRows(data.rows || [])
      }
    } catch (e) {
      console.error('Error fetching grid:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGrid() }, [fetchGrid])

  if (loading) {
    return (
      <div style={{ padding: '100px 24px', textAlign: 'center', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
        Loading wealth data...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem', marginBottom: '6px' }}>No data yet</div>
        <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>Add your first month in Wealth Grid to see your overview here.</div>
      </div>
    )
  }

  /* ── Derived data ── */
  const latest = rows[0]
  const prev = rows[1]
  const latestTotal = latest?.total ?? 0
  const prevTotal = prev?.total ?? 0
  const diff = latestTotal - prevTotal
  const diffPct = prevTotal > 0 ? (diff / prevTotal) * 100 : 0
  const diffSign = diff >= 0 ? '+' : ''
  const diffColor = diff >= 0 ? '#34d399' : '#ff4d6a'

  const [yr, mo] = (latest?.month ?? '2000-01').split('-').map(Number)
  const lastYearMonth = `${yr - 1}-${String(mo).padStart(2, '0')}`
  const lastYearRow = rows.find((r) => r.month === lastYearMonth)
  const lyDiff = lastYearRow != null ? latestTotal - lastYearRow.total : null
  const lyPct = lastYearRow && lastYearRow.total > 0 ? (lyDiff! / lastYearRow.total) * 100 : null
  const lyLabel = new Date(`${lastYearMonth}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()

  const athTotal = Math.max(...rows.map((r) => r.total))
  const athRow = rows.find((r) => r.total === athTotal)

  const activeColumns = columns.filter((col) =>
    rows.some((r) => r.values[col.id] != null && Number(r.values[col.id]) !== 0)
  )

  const colChanges = prev
    ? activeColumns.map((col) => {
        const curr = latest?.values[col.id] ?? 0
        const p = prev?.values[col.id] ?? 0
        const d = curr - p
        return { col, diff: d, pct: p > 0 ? (d / p) * 100 : 0 }
      })
    : []
  const topPerformer = colChanges.length ? colChanges.reduce((a, b) => a.diff > b.diff ? a : b) : null
  const biggestDrop = colChanges.length ? colChanges.reduce((a, b) => a.diff < b.diff ? a : b) : null

  const allTimeline = [...rows].reverse().map((r) => ({ month: r.month, label: fmtMon(r.month), total: r.total }))
  const timelineData = timeRange === '6M' ? allTimeline.slice(-6) : timeRange === '1Y' ? allTimeline.slice(-12) : allTimeline

  const sparkData = allTimeline.slice(-6)

  const donutData = activeColumns
    .map((col) => ({ name: col.label, value: latest?.values[col.id] ?? 0, color: col.color }))
    .filter((d) => d.value > 0)

  const latestMonthLabel = new Date(`${latest.month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  /* ── Style helpers ── */
  const card: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px',
  }
  const mono = (sz: string, color = 'var(--text3)'): React.CSSProperties => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: sz, color, letterSpacing: '0.05em',
  })
  const label9 = mono('9px')
  const kpiCard: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px',
  }

  return (
    <div style={{ padding: isMobile ? '80px 16px 48px' : '80px 32px 60px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ══ SECTION 1: HERO CARD ══ */}
      <div style={{ ...card, borderLeft: '4px solid var(--accent)', padding: isMobile ? '20px' : '28px 32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '20px' : '48px', alignItems: 'center' }}>

          {/* Panel A — Net Worth */}
          <div style={{ flex: '2 1 180px' }}>
            <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '8px' }}>NET WORTH</div>
            <div style={{ ...mono(isMobile ? '28px' : '36px', 'var(--accent)'), fontWeight: 700, lineHeight: 1.1 }}>
              {formatINR(latestTotal)}
            </div>
            <div style={{ ...mono('15px', 'var(--text2)'), marginTop: '4px' }}>{formatINRShort(latestTotal)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>as of {latestMonthLabel}</div>
          </div>

          {/* Panel B — Comparisons */}
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {prev && (
              <div>
                <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '4px' }}>vs {prev.label.toUpperCase()}</div>
                <div style={{ ...mono('15px', diffColor), fontWeight: 700 }}>
                  {diffSign}{formatINR(Math.abs(diff))}
                  <span style={{ ...mono('11px', diffColor), fontWeight: 400, marginLeft: '6px', opacity: 0.85 }}>({diffSign}{diffPct.toFixed(1)}%)</span>
                </div>
              </div>
            )}
            <div>
              <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '4px' }}>vs {lyLabel}</div>
              {lyDiff != null && lyPct != null ? (
                <div style={{ ...mono('15px', lyDiff >= 0 ? '#34d399' : '#ff4d6a'), fontWeight: 700 }}>
                  {lyDiff >= 0 ? '+' : ''}{formatINR(Math.abs(lyDiff))}
                  <span style={{ ...mono('11px', lyDiff >= 0 ? '#34d399' : '#ff4d6a'), fontWeight: 400, marginLeft: '6px', opacity: 0.85 }}>({lyDiff >= 0 ? '+' : ''}{lyPct.toFixed(1)}%)</span>
                </div>
              ) : (
                <div style={{ ...mono('15px'), fontWeight: 400 }} title="Not enough history yet">—</div>
              )}
            </div>
          </div>

          {/* Panel C — Sparkline */}
          {sparkData.length > 1 && !isMobile && (
            <div style={{ flex: '0 0 140px' }}>
              <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '8px' }}>LAST {sparkData.length} MONTHS</div>
              <ResponsiveContainer width={140} height={60}>
                <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#00d4aa" strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', ...mono('10px', 'var(--accent)') }}>
                          {formatINRShort(payload[0].value as number)}
                        </div>
                      ) : null
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ══ SECTION 2: KPI CARDS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '14px' }}>

        <div style={kpiCard}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>📈</div>
          <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '6px' }}>TOP PERFORMER</div>
          {topPerformer && topPerformer.diff > 0 ? (
            <>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{topPerformer.col.label}</div>
              <div style={{ ...mono('11px', '#34d399') }}>+{formatINRShort(topPerformer.diff)} (+{topPerformer.pct.toFixed(1)}%)</div>
            </>
          ) : <div style={{ ...mono('13px'), marginTop: '4px' }}>—</div>}
        </div>

        <div style={kpiCard}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>📉</div>
          <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '6px' }}>LARGEST DROP</div>
          {biggestDrop && biggestDrop.diff < 0 ? (
            <>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{biggestDrop.col.label}</div>
              <div style={{ ...mono('11px', '#ff4d6a') }}>{formatINRShort(biggestDrop.diff)} ({biggestDrop.pct.toFixed(1)}%)</div>
            </>
          ) : <div style={{ ...mono('13px'), marginTop: '4px' }}>None</div>}
        </div>

        <div style={kpiCard}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>🏆</div>
          <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '6px' }}>ALL-TIME HIGH</div>
          <div style={{ ...mono('17px', 'var(--text)'), fontWeight: 700, marginBottom: '3px' }}>{formatINRShort(athTotal)}</div>
          {athRow && (
            <div style={{ ...mono('11px') }}>
              {new Date(`${athRow.month}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>

        <div style={kpiCard}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>📅</div>
          <div style={{ ...label9, textTransform: 'uppercase', marginBottom: '6px' }}>MONTHS TRACKED</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{rows.length} months</div>
          <div style={{ ...mono('11px') }}>since {rows[rows.length - 1].label}</div>
        </div>
      </div>

      {/* ══ SECTION 3: NET WORTH TIMELINE ══ */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ ...mono('0.8rem', 'var(--text2)'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            NET WORTH OVER TIME
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['6M', '1Y', 'ALL'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '4px 12px', ...mono('0.72rem', timeRange === r ? '#0a0c10' : 'var(--text2)'),
                  fontWeight: 600, border: 'none', borderRadius: '20px', cursor: 'pointer',
                  background: timeRange === r ? 'var(--accent)' : 'var(--surface2)',
                  transition: 'all 0.15s',
                }}
              >{r}</button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
          <AreaChart data={timelineData} margin={{ top: 10, right: 40, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false} axisLine={false}
              interval={timelineData.length > 12 ? 2 : timelineData.length > 6 ? 1 : 0}
            />
            <YAxis
              tickFormatter={formatINRShort}
              tick={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false} axisLine={false} width={72}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const val = payload[0].value as number
                const idx = timelineData.findIndex((d) => d.label === label)
                const prevVal = idx > 0 ? timelineData[idx - 1].total : null
                const chg = prevVal != null ? val - prevVal : null
                const chgPct = prevVal && prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : null
                return (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ ...mono('10px'), marginBottom: '4px' }}>{label}</div>
                    <div style={{ ...mono('13px', 'var(--accent)'), fontWeight: 700 }}>{formatINR(val)}</div>
                    {chg != null && chgPct != null && (
                      <div style={{ ...mono('10px', chg >= 0 ? '#34d399' : '#ff4d6a'), marginTop: '3px' }}>
                        {chg >= 0 ? '+' : ''}{formatINRShort(chg)} ({chg >= 0 ? '+' : ''}{chgPct.toFixed(1)}%) vs prev
                      </div>
                    )}
                  </div>
                )
              }}
            />
            <ReferenceLine
              y={athTotal}
              stroke="#ffc848"
              strokeDasharray="4 4"
              label={{ value: 'ATH', position: 'right', fontSize: 10, fill: '#ffc848', fontFamily: 'JetBrains Mono, monospace' }}
            />
            <Area
              type="monotone" dataKey="total"
              stroke="#00d4aa" strokeWidth={2} fill="url(#tlGrad)"
              dot={{ r: 4, fill: '#00d4aa', stroke: 'white', strokeWidth: 1 }}
              activeDot={{ r: 6, fill: 'white', stroke: '#00d4aa', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ══ SECTION 4: ALLOCATION SPLIT ══ */}
      {donutData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 3fr', gap: '20px' }}>

          {/* Donut */}
          <div style={card}>
            <div style={{ ...mono('0.8rem', 'var(--text2)'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              ALLOCATION
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={82} paddingAngle={3}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatINR(val)]}
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.78rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {donutData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text2)' }}>{d.name}</span>
                  <span style={{ ...mono('0.72rem', 'var(--text)'), fontWeight: 600 }}>{formatINRShort(d.value)}</span>
                  <span style={{ ...mono('0.7rem'), minWidth: '38px', textAlign: 'right' }}>
                    {latestTotal > 0 ? ((d.value / latestTotal) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent months table */}
          <div style={card}>
            <div style={{ ...mono('0.8rem', 'var(--text2)'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              RECENT MONTHS
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', ...mono('0.7rem', 'var(--text3)'), fontWeight: 600 }}>COLUMN</th>
                    {rows.slice(0, 4).reverse().map((r) => (
                      <th key={r.month} style={{ padding: '6px 10px', textAlign: 'right', ...mono('0.7rem', 'var(--text3)'), fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtMon(r.month)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeColumns.map((col) => (
                    <tr key={col.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: col.color, marginRight: '7px' }} />
                        {col.label}
                      </td>
                      {rows.slice(0, 4).reverse().map((r) => (
                        <td key={r.month} style={{ padding: '8px 10px', textAlign: 'right', ...mono('0.75rem', 'var(--text2)') }}>
                          {r.values[col.id] != null && Number(r.values[col.id]) !== 0 ? formatINRShort(r.values[col.id]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(0,212,170,0.3)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, ...mono('0.75rem', 'var(--accent)') }}>TOTAL</td>
                    {rows.slice(0, 4).reverse().map((r) => (
                      <td key={r.month} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, ...mono('0.75rem', 'var(--accent)') }}>
                        {formatINRShort(r.total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
