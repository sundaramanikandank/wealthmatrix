import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fetchOptionChain, fetchExpiries } from '../api/market'
import type { ChainData } from '../store/strategyStore'

type Instrument = 'NIFTY' | 'BANKNIFTY'

interface IVHistoryPoint {
  timestamp: string
  ceIV: number
  peIV: number
  atmIV: number
}

export default function IVCharts() {
  const [instrument, setInstrument] = useState<Instrument>('NIFTY')
  const [expiries, setExpiries] = useState<string[]>([])
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [chainData, setChainData] = useState<ChainData | null>(null)
  const [ivHistory, setIvHistory] = useState<IVHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch expiries on mount and instrument change
  useEffect(() => {
    async function loadExpiries() {
      try {
        const data = await fetchExpiries(instrument)
        const allExpiries = Array.from(new Set([...data.weekly, ...data.monthly])).sort()
        setExpiries(allExpiries)
        if (allExpiries.length > 0) {
          setSelectedExpiry(allExpiries[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expiries')
      }
    }
    loadExpiries()
  }, [instrument])

  // Fetch chain and IV history when expiry changes
  useEffect(() => {
    if (!selectedExpiry) return

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [chain, history] = await Promise.all([
          fetchOptionChain(instrument, selectedExpiry),
          fetch(`http://localhost:4000/api/market/iv-history?symbol=${instrument}&expiry=${selectedExpiry}`)
            .then(r => r.json())
            .then(d => d.data as IVHistoryPoint[]),
        ])
        setChainData(chain)
        setIvHistory(history)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [instrument, selectedExpiry])

  // Process chain data for volatility smile
  const smileData = useMemo(() => {
    if (!chainData) return []

    const strikes = Object.keys(chainData.chain).map(Number).sort((a, b) => a - b)
    
    return strikes.map(strike => ({
      strike,
      ceIV: chainData.chain[strike]?.ce?.impliedVolatility ?? null,
      peIV: chainData.chain[strike]?.pe?.impliedVolatility ?? null,
    })).filter(d => d.ceIV !== null || d.peIV !== null)
  }, [chainData])

  // Calculate current ATM IV and mock 52-week range
  const ivStats = useMemo(() => {
    if (!chainData?.atmStrike) return null

    const atmRow = chainData.chain[chainData.atmStrike]
    const ceIV = atmRow?.ce?.impliedVolatility ?? 0
    const peIV = atmRow?.pe?.impliedVolatility ?? 0
    const currentATM = (ceIV + peIV) / 2

    // Mock 52-week data (in production, fetch from backend)
    const week52High = currentATM * 1.5
    const week52Low = currentATM * 0.7
    const percentile = ((currentATM - week52Low) / (week52High - week52Low)) * 100

    return {
      current: currentATM,
      week52High,
      week52Low,
      percentile,
    }
  }, [chainData])

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'auto' }}>
      {/* Controls Bar */}
      <div style={{
        padding: '12px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Instrument Selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['NIFTY', 'BANKNIFTY'] as Instrument[]).map((sym) => (
            <button key={sym} onClick={() => setInstrument(sym)} style={{
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

        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Loading charts…</span>}
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

      {/* Charts Container */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {!chainData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text3)' }}>
            {loading ? 'Loading charts…' : 'Select an expiry to load charts'}
          </div>
        ) : (
          <>
            {/* IV Percentile Card */}
            {ivStats && (
              <div style={{
                background: 'var(--surface2)', borderRadius: 8, padding: 20,
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20,
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Current ATM IV
                  </div>
                  <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent2)' }}>
                    {ivStats.current.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    52-Week High
                  </div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text2)' }}>
                    {ivStats.week52High.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    52-Week Low
                  </div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text2)' }}>
                    {ivStats.week52Low.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Percentile
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="mono" style={{
                      fontSize: '1.2rem', fontWeight: 700,
                      color: ivStats.percentile < 25 ? 'var(--green)' : ivStats.percentile > 75 ? 'var(--red)' : 'var(--yellow)',
                    }}>
                      {ivStats.percentile.toFixed(0)}%
                    </div>
                    <div style={{
                      flex: 1, height: 8, borderRadius: 4, background: 'var(--surface)',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${ivStats.percentile}%`,
                        background: ivStats.percentile < 25 ? 'var(--green)' : ivStats.percentile > 75 ? 'var(--red)' : 'var(--yellow)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Volatility Smile Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                Volatility Smile
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={smileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strike" stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} domain={[0, 100]} label={{ value: 'IV %', angle: -90, position: 'insideLeft', style: { fill: 'var(--text3)', fontSize: '0.7rem' } }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    formatter={(value) => {
                      const num = typeof value === 'number' ? value : null
                      return num !== null ? [`${num.toFixed(2)}%`] : ['—']
                    }}
                  />
                  {chainData.atmStrike && (
                    <ReferenceLine
                      x={chainData.atmStrike}
                      stroke="var(--yellow)"
                      strokeDasharray="3 3"
                      label={{ value: 'ATM', fill: 'var(--yellow)', fontSize: 11, position: 'top' }}
                    />
                  )}
                  <Line type="monotone" dataKey="ceIV" stroke="var(--green)" strokeWidth={2} dot={{ r: 2 }} name="CE IV" connectNulls />
                  <Line type="monotone" dataKey="peIV" stroke="var(--red)" strokeWidth={2} dot={{ r: 2 }} name="PE IV" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 2. ATM IV Over Time */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                ATM IV Over Time (Last 4 Hours)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={ivHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--text3)"
                    style={{ fontSize: '0.7rem' }}
                    tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} domain={[0, 100]} label={{ value: 'IV %', angle: -90, position: 'insideLeft', style: { fill: 'var(--text3)', fontSize: '0.7rem' } }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    labelFormatter={(ts) => new Date(ts).toLocaleString('en-IN')}
                    formatter={(value: number) => [`${value.toFixed(2)}%`]}
                  />
                  <Area type="monotone" dataKey="ceIV" stroke="var(--green)" fill="var(--green)" fillOpacity={0.3} strokeWidth={2} name="CE IV" />
                  <Area type="monotone" dataKey="peIV" stroke="var(--red)" fill="var(--red)" fillOpacity={0.3} strokeWidth={2} name="PE IV" />
                  <Line type="monotone" dataKey="atmIV" stroke="var(--accent2)" strokeWidth={2} dot={{ r: 3 }} name="ATM IV" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
