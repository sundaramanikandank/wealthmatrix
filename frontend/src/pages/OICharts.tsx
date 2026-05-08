import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fetchOptionChain, fetchExpiries } from '../api/market'
import type { ChainData } from '../store/strategyStore'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000'

type Instrument = 'NIFTY' | 'BANKNIFTY'

interface OIHistoryPoint {
  timestamp: string
  ceOI: number
  peOI: number
  pcr: number
}

export default function OICharts() {
  const navigate = useNavigate()
  const [instrument, setInstrument] = useState<Instrument>('NIFTY')
  const [expiries, setExpiries] = useState<string[]>([])
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [chainData, setChainData] = useState<ChainData | null>(null)
  const [oiHistory, setOiHistory] = useState<OIHistoryPoint[]>([])
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

  // Fetch chain and OI history when expiry changes
  useEffect(() => {
    if (!selectedExpiry) return

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [chain, history] = await Promise.all([
          fetchOptionChain(instrument, selectedExpiry),
          fetch(`${API_BASE_URL}/api/market/oi-history?symbol=${instrument}&expiry=${selectedExpiry}`)
            .then(r => r.json())
            .then(d => d.data as OIHistoryPoint[]),
        ])
        setChainData(chain)
        setOiHistory(history)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [instrument, selectedExpiry])

  // Process chain data for charts
  const chartData = useMemo(() => {
    if (!chainData) return { ceOI: [], peOI: [], combined: [], changeOI: [] }

    const strikes = Object.keys(chainData.chain).map(Number).sort((a, b) => a - b)
    
    // Filter to every 5th strike for display
    const displayStrikes = strikes.filter((_, i) => i % 5 === 0)

    const ceOI = displayStrikes.map(strike => ({
      strike,
      oi: chainData.chain[strike]?.ce?.openInterest ?? 0,
    }))

    const peOI = displayStrikes.map(strike => ({
      strike,
      oi: chainData.chain[strike]?.pe?.openInterest ?? 0,
    }))

    const combined = displayStrikes.map(strike => ({
      strike,
      ceOI: chainData.chain[strike]?.ce?.openInterest ?? 0,
      peOI: chainData.chain[strike]?.pe?.openInterest ?? 0,
    }))

    const changeOI = displayStrikes.map(strike => {
      const ceChange = (chainData.chain[strike]?.ce as any)?.changeinOpenInterest ?? 0
      const peChange = (chainData.chain[strike]?.pe as any)?.changeinOpenInterest ?? 0
      return {
        strike,
        ceChange,
        peChange,
        totalChange: ceChange + peChange,
      }
    })

    return { ceOI, peOI, combined, changeOI }
  }, [chainData])

  // Format OI for display
  function fmtOI(n: number): string {
    if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`
    if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`
    return n.toLocaleString('en-IN')
  }

  function handleBarClick(strike: number) {
    navigate(`/strategy-builder?instrument=${instrument}&expiry=${selectedExpiry}&strike=${strike}`)
  }

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
            {/* 1. CE OI Bar Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                Call (CE) Open Interest
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.ceOI}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strike" stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} tickFormatter={fmtOI} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    formatter={(value: number) => [fmtOI(value), 'CE OI']}
                  />
                  <Bar dataKey="oi" fill="var(--green)" cursor="pointer" onClick={(data) => handleBarClick(data.strike)} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. PE OI Bar Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                Put (PE) Open Interest
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.peOI}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strike" stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} tickFormatter={fmtOI} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    formatter={(value: number) => [fmtOI(value), 'PE OI']}
                  />
                  <Bar dataKey="oi" fill="var(--red)" cursor="pointer" onClick={(data) => handleBarClick(data.strike)} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Combined OI Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                Combined Open Interest (CE vs PE)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strike" stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} tickFormatter={fmtOI} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    formatter={(value: number) => [fmtOI(value)]}
                  />
                  <Bar dataKey="ceOI" fill="var(--green)" name="CE OI" />
                  <Bar dataKey="peOI" fill="var(--red)" name="PE OI" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. Change in OI Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                Change in Open Interest
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.changeOI}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="strike" stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  />
                  <ReferenceLine y={0} stroke="var(--text3)" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="totalChange"
                    stroke="var(--accent2)"
                    fill="var(--accent2)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 5. PCR Trend Chart */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                PCR Trend (Last 4 Hours)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={oiHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="var(--text3)"
                    style={{ fontSize: '0.7rem' }}
                    tickFormatter={(ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="var(--text3)" style={{ fontSize: '0.7rem' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6 }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                    labelFormatter={(ts) => new Date(ts).toLocaleString('en-IN')}
                    formatter={(value: number) => [value.toFixed(4), 'PCR']}
                  />
                  <ReferenceLine y={1.0} stroke="var(--yellow)" strokeDasharray="3 3" label={{ value: 'PCR = 1.0', fill: 'var(--yellow)', fontSize: 12 }} />
                  <Line type="monotone" dataKey="pcr" stroke="var(--accent2)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
