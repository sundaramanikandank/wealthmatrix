import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSpot, fetchExpiries, fetchOptionChain } from '../api/market'
import StaleDataBanner from '../components/StaleDataBanner'
import { TableSkeleton } from '../components/LoadingSpinner'

type Instrument = 'NIFTY' | 'BANKNIFTY'

interface ScreenerRow {
  symbol: Instrument
  spot: number
  change: number
  changePercent: number
  atmStrike: number | null
  ceIV: number | null
  peIV: number | null
  ivp: number
  straddlePrem: number | null
  pcr: number | null
  maxPain: number | null
  weeklyExpiry: string
}

type SortKey = keyof ScreenerRow
type SortOrder = 'asc' | 'desc'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<ScreenerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [staleTimestamp, setStaleTimestamp] = useState<string | null>(null)
  const [showStaleBanner, setShowStaleBanner] = useState(true)

  // Fetch data for all instruments
  async function loadData() {
    setLoading(true)
    try {
      const instruments: Instrument[] = ['NIFTY', 'BANKNIFTY']
      const rows = await Promise.all(instruments.map(async (symbol) => {
        try {
          // Fetch spot and expiries
          const [spotData, expiriesData] = await Promise.all([
            fetchSpot(symbol),
            fetchExpiries(symbol),
          ])

          // Check for stale data
          if (spotData.stale || expiriesData.stale) {
            setIsStale(true)
            setStaleTimestamp(spotData.timestamp)
            setShowStaleBanner(true)
          }

          // Get weekly expiry (first one)
          const weeklyExpiry = expiriesData.weekly[0] || expiriesData.monthly[0] || ''

          // Fetch option chain for weekly expiry
          let chainData = null
          if (weeklyExpiry) {
            chainData = await fetchOptionChain(symbol, weeklyExpiry)
            if (chainData.stale) {
              setIsStale(true)
              setStaleTimestamp(chainData.timestamp)
              setShowStaleBanner(true)
            }
          }

          // Calculate straddle premium (ATM CE + ATM PE)
          let straddlePrem = null
          if (chainData?.atmStrike) {
            const atmRow = chainData.chain[chainData.atmStrike]
            const ceLTP = atmRow?.ce?.lastPrice ?? 0
            const peLTP = atmRow?.pe?.lastPrice ?? 0
            straddlePrem = ceLTP + peLTP
          }

          // Calculate CE and PE IV at ATM
          let ceIV = null
          let peIV = null
          if (chainData?.atmStrike) {
            const atmRow = chainData.chain[chainData.atmStrike]
            ceIV = atmRow?.ce?.impliedVolatility ?? null
            peIV = atmRow?.pe?.impliedVolatility ?? null
          }

          // Mock IVP calculation (in production, fetch historical data)
          const avgIV = 20 // Mock historical average
          const currentIV = ceIV && peIV ? (ceIV + peIV) / 2 : 20
          const ivp = currentIV < avgIV ? 30 : 70

          return {
            symbol,
            spot: spotData.spot,
            change: spotData.change,
            changePercent: spotData.changePct,
            atmStrike: chainData?.atmStrike ?? null,
            ceIV,
            peIV,
            ivp,
            straddlePrem,
            pcr: chainData?.pcr ?? null,
            maxPain: chainData?.maxPain ?? null,
            weeklyExpiry,
          }
        } catch (err) {
          console.error(`Failed to fetch data for ${symbol}:`, err)
          return {
            symbol,
            spot: 0,
            change: 0,
            changePercent: 0,
            atmStrike: null,
            ceIV: null,
            peIV: null,
            ivp: 50,
            straddlePrem: null,
            pcr: null,
            maxPain: null,
            weeklyExpiry: '',
          }
        }
      }))

      setData(rows)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    
    if (aVal === null) return 1
    if (bVal === null) return -1
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  function handleRowClick(row: ScreenerRow) {
    navigate(`/strategy-builder?instrument=${row.symbol}&expiry=${row.weeklyExpiry}&strike=${row.atmStrike || ''}`)
  }

  function fmtNum(n: number | null, decimals = 2): string {
    if (n === null) return '—'
    return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  function getIVPColor(ivp: number): string {
    if (ivp < 25) return 'var(--green)'
    if (ivp > 75) return 'var(--red)'
    return 'var(--yellow)'
  }

  function getStraddleColor(prem: number | null): string {
    if (prem === null) return 'transparent'
    // Normalize: assume 200-800 range for NIFTY, scale accordingly
    const normalized = Math.min(Math.max((prem - 200) / 600, 0), 1)
    const red = Math.floor(255 * normalized)
    const green = Math.floor(255 * (1 - normalized))
    return `rgba(${red}, ${green}, 100, 0.15)`
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 8px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--text3)',
    textAlign: 'left',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '2px solid var(--border)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 8px',
    fontSize: '0.8rem',
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    fontFamily: 'JetBrains Mono, monospace',
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Stale Data Banner */}
      {isStale && showStaleBanner && (
        <StaleDataBanner
          timestamp={staleTimestamp || undefined}
          onDismiss={() => setShowStaleBanner(false)}
        />
      )}

      {/* Header */}
      <div style={{
        padding: '16px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: isStale && showStaleBanner ? '46px' : 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            Market Screener
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text3)' }}>
            Live data for NIFTY and BANKNIFTY options
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {lastUpdated && (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button onClick={loadData} disabled={loading} style={{
            marginTop: 6, padding: '6px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            background: loading ? 'var(--surface)' : 'var(--accent)',
            color: loading ? 'var(--text3)' : '#0a0c10',
            border: 'none',
          }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', padding: '20px' }}>
        {loading && data.length === 0 ? (
          <TableSkeleton rows={2} columns={9} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface2)', zIndex: 10 }}>
              <tr>
                <th style={thStyle} onClick={() => handleSort('symbol')}>
                  Symbol {sortKey === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={thStyle} onClick={() => handleSort('spot')}>
                  Spot {sortKey === 'spot' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={thStyle} onClick={() => handleSort('changePercent')}>
                  Chng% {sortKey === 'changePercent' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('atmStrike')}>
                  ATM Strike {sortKey === 'atmStrike' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('ceIV')}>
                  CE IV {sortKey === 'ceIV' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('peIV')}>
                  PE IV {sortKey === 'peIV' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('ivp')}>
                  IVP {sortKey === 'ivp' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={thStyle} onClick={() => handleSort('straddlePrem')}>
                  Straddle {sortKey === 'straddlePrem' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th style={thStyle} onClick={() => handleSort('pcr')}>
                  PCR {sortKey === 'pcr' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('maxPain')}>
                  Max Pain {sortKey === 'maxPain' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hide-mobile" style={thStyle} onClick={() => handleSort('weeklyExpiry')}>
                  Weekly Exp {sortKey === 'weeklyExpiry' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr
                  key={row.symbol}
                  onClick={() => handleRowClick(row)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent2)' }}>
                    {row.symbol}
                  </td>
                  <td style={tdStyle}>
                    {fmtNum(row.spot, 2)}
                  </td>
                  <td style={{
                    ...tdStyle,
                    color: row.changePercent > 0 ? 'var(--green)' : row.changePercent < 0 ? 'var(--red)' : 'var(--text)',
                    fontWeight: 600,
                  }}>
                    {row.changePercent > 0 ? '+' : ''}{fmtNum(row.changePercent, 2)}%
                  </td>
                  <td className="hide-mobile" style={tdStyle}>
                    {row.atmStrike ? row.atmStrike.toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="hide-mobile" style={tdStyle}>
                    {row.ceIV !== null ? `${row.ceIV.toFixed(2)}%` : '—'}
                  </td>
                  <td className="hide-mobile" style={tdStyle}>
                    {row.peIV !== null ? `${row.peIV.toFixed(2)}%` : '—'}
                  </td>
                  <td className="hide-mobile" style={{
                    ...tdStyle,
                    color: getIVPColor(row.ivp),
                    fontWeight: 700,
                  }}>
                    {row.ivp}
                  </td>
                  <td style={{
                    ...tdStyle,
                    background: getStraddleColor(row.straddlePrem),
                    fontWeight: 600,
                  }}>
                    {fmtNum(row.straddlePrem, 2)}
                  </td>
                  <td style={tdStyle}>
                    {row.pcr !== null ? row.pcr.toFixed(4) : '—'}
                  </td>
                  <td className="hide-mobile" style={tdStyle}>
                    {row.maxPain ? row.maxPain.toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="hide-mobile" style={tdStyle}>
                    {row.weeklyExpiry || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
        }
      `}</style>
    </div>
  )
}
