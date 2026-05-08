import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { fetchOptionChain, fetchExpiries } from '../api/market'
import type { ChainData } from '../store/strategyStore'

type Instrument = 'NIFTY' | 'BANKNIFTY'

export default function OptionChain() {
  const [instrument, setInstrument] = useState<Instrument>('NIFTY')
  const [expiries, setExpiries] = useState<string[]>([])
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [chainData, setChainData] = useState<ChainData | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Fetch expiries on mount and instrument change
  useEffect(() => {
    async function loadExpiries() {
      try {
        const data = await fetchExpiries(instrument)
        // Deduplicate and sort expiries
        const allExpiries = Array.from(new Set([...data.weekly, ...data.monthly])).sort()
        setExpiries(allExpiries)
        if (allExpiries.length > 0 && !selectedExpiry) {
          setSelectedExpiry(allExpiries[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expiries')
      }
    }
    loadExpiries()
  }, [instrument]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chain data
  const loadChain = useCallback(async () => {
    if (!selectedExpiry) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOptionChain(instrument, selectedExpiry)
      setChainData(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch option chain')
    } finally {
      setLoading(false)
    }
  }, [instrument, selectedExpiry])

  // Load chain on expiry change
  useEffect(() => {
    if (selectedExpiry) loadChain()
  }, [selectedExpiry, loadChain])

  // Auto-refresh every 60s
  useEffect(() => {
    if (!autoRefresh || !selectedExpiry) return
    const interval = setInterval(loadChain, 60_000)
    return () => clearInterval(interval)
  }, [autoRefresh, selectedExpiry]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to ATM on data load
  useEffect(() => {
    if (!chainData?.atmStrike || !tableRef.current) return
    setTimeout(() => {
      const atmRow = tableRef.current?.querySelector(`[data-strike="${chainData.atmStrike}"]`)
      atmRow?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [chainData?.atmStrike])

  // Calculate metrics
  const totalCeOI = useMemo(() => {
    if (!chainData) return 0
    return Object.values(chainData.chain).reduce((sum, row) => sum + (row.ce?.openInterest ?? 0), 0)
  }, [chainData])

  const totalPeOI = useMemo(() => {
    if (!chainData) return 0
    return Object.values(chainData.chain).reduce((sum, row) => sum + (row.pe?.openInterest ?? 0), 0)
  }, [chainData])

  const atmIV = useMemo(() => {
    if (!chainData?.atmStrike) return null
    const atmRow = chainData.chain[chainData.atmStrike]
    if (!atmRow) return null
    const ceIV = atmRow.ce?.impliedVolatility ?? 0
    const peIV = atmRow.pe?.impliedVolatility ?? 0
    return (ceIV + peIV) / 2
  }, [chainData])

  // Get top 3 OI strikes
  const topCeOI = useMemo(() => {
    if (!chainData) return new Set<number>()
    return new Set(
      Object.entries(chainData.chain)
        .filter(([, row]) => row.ce)
        .sort((a, b) => (b[1].ce?.openInterest ?? 0) - (a[1].ce?.openInterest ?? 0))
        .slice(0, 3)
        .map(([strike]) => Number(strike))
    )
  }, [chainData])

  const topPeOI = useMemo(() => {
    if (!chainData) return new Set<number>()
    return new Set(
      Object.entries(chainData.chain)
        .filter(([, row]) => row.pe)
        .sort((a, b) => (b[1].pe?.openInterest ?? 0) - (a[1].pe?.openInterest ?? 0))
        .slice(0, 3)
        .map(([strike]) => Number(strike))
    )
  }, [chainData])

  const strikes = useMemo(() => {
    if (!chainData) return []
    return Object.keys(chainData.chain).map(Number).sort((a, b) => a - b)
  }, [chainData])

  function handleInstrumentChange(newInstrument: Instrument) {
    setInstrument(newInstrument)
    setSelectedExpiry('')
    setChainData(null)
  }

  function fmtNum(n: number | undefined | null, decimals = 2): string {
    if (n == null) return '—'
    return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  function fmtOI(n: number | undefined | null): string {
    if (n == null) return '—'
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`
    if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`
    return n.toLocaleString('en-IN')
  }

  const isATMRange = (strike: number) => {
    if (!chainData?.atmStrike) return false
    return Math.abs(strike - chainData.atmStrike) <= 2 * (instrument === 'NIFTY' ? 50 : 100)
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Controls Bar */}
      <div style={{
        padding: '12px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        {/* Instrument Selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['NIFTY', 'BANKNIFTY'] as Instrument[]).map((sym) => (
            <button key={sym} onClick={() => handleInstrumentChange(sym)} style={{
              padding: '6px 14px', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
              background: instrument === sym ? 'var(--accent)' : 'var(--surface)',
              color: instrument === sym ? '#0a0c10' : 'var(--text2)',
              borderColor: instrument === sym ? 'var(--accent)' : 'var(--border)',
            }}>{sym}</button>
          ))}
        </div>

        {/* Expiry Dropdown */}
        <select value={selectedExpiry} onChange={(e) => setSelectedExpiry(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
          background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
          outline: 'none', fontFamily: 'JetBrains Mono, monospace',
        }}>
          {expiries.length === 0 ? (
            <option value="">Loading…</option>
          ) : (
            expiries.map((exp) => <option key={exp} value={exp}>{exp}</option>)
          )}
        </select>

        {/* Auto-refresh Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text2)' }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-refresh (60s)
        </label>

        {/* Last Updated */}
        {lastUpdated && (
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text3)', marginLeft: 'auto' }}>
            Updated at {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        {/* Refresh Button */}
        <button onClick={loadChain} disabled={loading || !selectedExpiry} style={{
          padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
          cursor: loading || !selectedExpiry ? 'default' : 'pointer',
          background: loading || !selectedExpiry ? 'var(--surface)' : 'var(--accent)',
          color: loading || !selectedExpiry ? 'var(--text3)' : '#0a0c10',
          border: 'none',
        }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '10px 16px', background: 'var(--red)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.85rem' }}>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem',
          }}>×</button>
        </div>
      )}

      {/* Metrics Row */}
      {chainData && (
        <div style={{
          padding: '12px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12,
        }}>
          {[
            { label: 'Spot', value: fmtNum(chainData.spot, 2), color: 'var(--accent2)' },
            { label: 'PCR', value: chainData.pcr ? chainData.pcr.toFixed(4) : '—', color: 'var(--text)' },
            { label: 'Max Pain', value: chainData.maxPain ? fmtNum(chainData.maxPain, 0) : '—', color: 'var(--yellow)' },
            { label: 'Total CE OI', value: fmtOI(totalCeOI), color: 'var(--green)' },
            { label: 'Total PE OI', value: fmtOI(totalPeOI), color: 'var(--red)' },
            { label: 'ATM IV', value: atmIV ? atmIV.toFixed(2) + '%' : '—', color: 'var(--purple)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>
                {label}
              </div>
              <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Option Chain Table */}
      <div ref={tableRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        {!chainData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)' }}>
            {loading ? 'Loading chain…' : 'Select an expiry to load option chain'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface2)', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {/* CE Headers */}
                <th className="hide-mobile" style={thStyle}>CE OI</th>
                <th className="hide-mobile" style={thStyle}>Δ OI</th>
                <th className="hide-mobile" style={thStyle}>Vol</th>
                <th className="hide-mobile" style={thStyle}>IV</th>
                <th style={thStyle}>CE LTP</th>
                <th className="hide-mobile" style={thStyle}>Bid</th>
                <th className="hide-mobile" style={thStyle}>Ask</th>
                {/* Strike */}
                <th style={{ ...thStyle, background: 'var(--yellow)', color: '#0a0c10', fontWeight: 700 }}>STRIKE</th>
                {/* PE Headers */}
                <th className="hide-mobile" style={thStyle}>Ask</th>
                <th className="hide-mobile" style={thStyle}>Bid</th>
                <th style={thStyle}>PE LTP</th>
                <th className="hide-mobile" style={thStyle}>IV</th>
                <th className="hide-mobile" style={thStyle}>Vol</th>
                <th className="hide-mobile" style={thStyle}>Δ OI</th>
                <th className="hide-mobile" style={thStyle}>PE OI</th>
              </tr>
            </thead>
            <tbody>
              {strikes.map((strike) => {
                const row = chainData.chain[strike]
                const isATM = isATMRange(strike)
                const isCeTop = topCeOI.has(strike)
                const isPeTop = topPeOI.has(strike)

                return (
                  <tr key={strike} data-strike={strike} style={{
                    height: 28, borderBottom: '1px solid var(--border)',
                    background: isATM ? 'rgba(255,193,7,0.08)' : undefined,
                  }}>
                    {/* CE Side */}
                    <td className="hide-mobile" style={tdStyle((row.ce as any)?.changeinOpenInterest, isCeTop)}>{fmtOI(row.ce?.openInterest)}</td>
                    <td className="hide-mobile" style={tdStyle((row.ce as any)?.changeinOpenInterest, false)}>{fmtNum((row.ce as any)?.changeinOpenInterest, 0)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.ce as any)?.totalTradedVolume, 0)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum(row.ce?.impliedVolatility, 2)}</td>
                    <td style={tdStyle(null, isCeTop)}>{fmtNum(row.ce?.lastPrice, 2)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.ce as any)?.bidprice, 2)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.ce as any)?.askPrice, 2)}</td>
                    {/* Strike */}
                    <td style={{
                      ...tdStyle(null, false),
                      textAlign: 'center',
                      fontWeight: 700,
                      background: isATM ? 'var(--yellow)' : 'var(--surface2)',
                      color: isATM ? '#0a0c10' : 'var(--text)',
                    }}>{strike.toLocaleString('en-IN')}</td>
                    {/* PE Side */}
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.pe as any)?.askPrice, 2)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.pe as any)?.bidprice, 2)}</td>
                    <td style={tdStyle(null, isPeTop)}>{fmtNum(row.pe?.lastPrice, 2)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum(row.pe?.impliedVolatility, 2)}</td>
                    <td className="hide-mobile" style={tdStyle(null, false)}>{fmtNum((row.pe as any)?.totalTradedVolume, 0)}</td>
                    <td className="hide-mobile" style={tdStyle((row.pe as any)?.changeinOpenInterest, false)}>{fmtNum((row.pe as any)?.changeinOpenInterest, 0)}</td>
                    <td className="hide-mobile" style={tdStyle((row.pe as any)?.changeinOpenInterest, isPeTop)}>{fmtOI(row.pe?.openInterest)}</td>
                  </tr>
                )
              })}
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

const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'var(--text3)',
  textAlign: 'right',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border)',
}

function tdStyle(oiChange: number | undefined | null, isBold: boolean): React.CSSProperties {
  let bg = 'transparent'
  if (oiChange != null && oiChange > 0) bg = 'rgba(0,212,170,0.15)'
  if (oiChange != null && oiChange < 0) bg = 'rgba(255,77,106,0.15)'

  return {
    padding: '4px 6px',
    textAlign: 'right',
    color: 'var(--text)',
    background: bg,
    fontWeight: isBold ? 700 : 400,
  }
}
