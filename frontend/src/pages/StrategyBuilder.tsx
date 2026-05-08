import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams }              from 'react-router-dom'
import { useStrategyStore }         from '../store/strategyStore'
import type { Instrument, StoreLeg, OptionType, Side, ChainData, SpotData } from '../store/strategyStore'
import { useAuthStore }             from '../store/authStore'
import { saveStrategy }             from '../api/market'
import PayoffChart                  from '../components/PayoffChart'
import StrategyCard                 from '../components/StrategyCard'
import StrategyModal                from '../components/StrategyModal'
import { calcGreeks }               from '../utils/greeks'
import { calcPayoffRange, calcBreakevens, calcMaxProfit, calcMaxLoss } from '../utils/payoff'
import type { Leg as PayoffLeg }    from '../utils/payoff'
import { getStrategiesByCategory, calculateATM, type Strategy } from '../data/strategies'

type ActiveTab = 'build' | 'strategies' | 'chain'

// ─── Constants ────────────────────────────────────────────────────────────────

const LOT_SIZES: Record<Instrument, number> = { NIFTY: 75, BANKNIFTY: 35 }
const STEP_SIZES: Record<Instrument, number> = { NIFTY: 50, BANKNIFTY: 100 }
const RISK_FREE_RATE = 0.065

// ─── Utility functions ────────────────────────────────────────────────────────

function daysToExpiry(expiry: string): number {
  const cleaned = expiry.replace(/-/g, ' ')
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return 30
  d.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((d.getTime() - now.getTime()) / 86_400_000))
}

function getATM(spot: number, instrument: Instrument): number {
  const m = STEP_SIZES[instrument]
  return Math.round(spot / m) * m
}

function getLTPFromChain(chain: ChainData | null, strike: number, type: OptionType): number {
  if (!chain) return 0
  const row = chain.chain[strike]
  if (!row) return 0
  return (type === 'CE' ? row.ce?.lastPrice : row.pe?.lastPrice) ?? 0
}

function getIVFromChain(chain: ChainData | null, strike: number, type: OptionType): number {
  if (!chain) return 0.15
  const row = chain.chain[strike]
  if (!row) return 0.15
  const iv = (type === 'CE' ? row.ce?.impliedVolatility : row.pe?.impliedVolatility) ?? 15
  return (iv > 1 ? iv / 100 : iv) || 0.15
}

function fmtINR(v: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
}

function fmtPnl(v: number): string {
  const abs = Math.abs(v)
  const sign = v >= 0 ? '+' : '-'
  if (abs >= 1_00_000) return `${sign}₹${fmtINR(abs / 1_00_000)}L`
  if (abs >= 1_000)    return `${sign}₹${fmtINR(abs / 1_000)}k`
  return `${sign}₹${fmtINR(abs)}`
}

// ─── Preset strategy templates ────────────────────────────────────────────────

type LTPGetter = (strike: number, type: 'CE' | 'PE') => number
type LegTemplate = Omit<StoreLeg, 'id'>

const STRATEGY_TEMPLATES: Record<string, (atm: number, step: number, exp: string, ltp: LTPGetter) => LegTemplate[]> = {
  'Long Call':      (a, _s, e, g) => [{ type:'CE', side:'BUY',  strike:a,      lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 }],
  'Long Put':       (a, _s, e, g) => [{ type:'PE', side:'BUY',  strike:a,      lots:1, ltp:g(a,'PE'),      expiry:e, iv:0.15 }],
  'Short Call':     (a, _s, e, g) => [{ type:'CE', side:'SELL', strike:a,      lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 }],
  'Short Put':      (a, _s, e, g) => [{ type:'PE', side:'SELL', strike:a,      lots:1, ltp:g(a,'PE'),      expiry:e, iv:0.15 }],
  'Covered Call':   (a,  s, e, g) => [
    { type:'CE', side:'BUY',  strike:a,    lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 },
    { type:'CE', side:'SELL', strike:a+s,  lots:1, ltp:g(a+s,'CE'),    expiry:e, iv:0.15 },
  ],
  'Protective Put': (a,  s, e, g) => [
    { type:'CE', side:'BUY',  strike:a,    lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 },
    { type:'PE', side:'BUY',  strike:a-s,  lots:1, ltp:g(a-s,'PE'),   expiry:e, iv:0.15 },
  ],
  'Bull Call Sprd': (a,  s, e, g) => [
    { type:'CE', side:'BUY',  strike:a,    lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 },
    { type:'CE', side:'SELL', strike:a+s,  lots:1, ltp:g(a+s,'CE'),   expiry:e, iv:0.15 },
  ],
  'Bear Put Sprd':  (a,  s, e, g) => [
    { type:'PE', side:'BUY',  strike:a,    lots:1, ltp:g(a,'PE'),      expiry:e, iv:0.15 },
    { type:'PE', side:'SELL', strike:a-s,  lots:1, ltp:g(a-s,'PE'),   expiry:e, iv:0.15 },
  ],
  'Bull Put Sprd':  (a,  s, e, g) => [
    { type:'PE', side:'SELL', strike:a,    lots:1, ltp:g(a,'PE'),      expiry:e, iv:0.15 },
    { type:'PE', side:'BUY',  strike:a-s,  lots:1, ltp:g(a-s,'PE'),   expiry:e, iv:0.15 },
  ],
  'Bear Call Sprd': (a,  s, e, g) => [
    { type:'CE', side:'SELL', strike:a,    lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 },
    { type:'CE', side:'BUY',  strike:a+s,  lots:1, ltp:g(a+s,'CE'),   expiry:e, iv:0.15 },
  ],
  'Straddle':       (a, _s, e, g) => [
    { type:'CE', side:'BUY', strike:a, lots:1, ltp:g(a,'CE'), expiry:e, iv:0.15 },
    { type:'PE', side:'BUY', strike:a, lots:1, ltp:g(a,'PE'), expiry:e, iv:0.15 },
  ],
  'Strangle':       (a,  s, e, g) => [
    { type:'CE', side:'BUY', strike:a+s,  lots:1, ltp:g(a+s,'CE'),   expiry:e, iv:0.15 },
    { type:'PE', side:'BUY', strike:a-s,  lots:1, ltp:g(a-s,'PE'),  expiry:e, iv:0.15 },
  ],
  'Iron Condor':    (a,  s, e, g) => [
    { type:'CE', side:'SELL', strike:a+s,    lots:1, ltp:g(a+s,'CE'),    expiry:e, iv:0.15 },
    { type:'CE', side:'BUY',  strike:a+s*2,  lots:1, ltp:g(a+s*2,'CE'), expiry:e, iv:0.15 },
    { type:'PE', side:'SELL', strike:a-s,    lots:1, ltp:g(a-s,'PE'),    expiry:e, iv:0.15 },
    { type:'PE', side:'BUY',  strike:a-s*2,  lots:1, ltp:g(a-s*2,'PE'), expiry:e, iv:0.15 },
  ],
  'Iron Butterfly': (a,  s, e, g) => [
    { type:'CE', side:'SELL', strike:a,    lots:1, ltp:g(a,'CE'),      expiry:e, iv:0.15 },
    { type:'CE', side:'BUY',  strike:a+s,  lots:1, ltp:g(a+s,'CE'),   expiry:e, iv:0.15 },
    { type:'PE', side:'SELL', strike:a,    lots:1, ltp:g(a,'PE'),      expiry:e, iv:0.15 },
    { type:'PE', side:'BUY',  strike:a-s,  lots:1, ltp:g(a-s,'PE'),  expiry:e, iv:0.15 },
  ],
  'Synthetic Long': (a, _s, e, g) => [
    { type:'CE', side:'BUY',  strike:a, lots:1, ltp:g(a,'CE'), expiry:e, iv:0.15 },
    { type:'PE', side:'SELL', strike:a, lots:1, ltp:g(a,'PE'), expiry:e, iv:0.15 },
  ],
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 12px',
}
const inputStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', padding: '6px 10px', fontSize: '0.82rem',
  width: '100%', outline: 'none', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.07em',
  textTransform: 'uppercase' as const, marginBottom: 4, display: 'block',
}
const stepBtn: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
  background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)',
  flexShrink: 0, fontFamily: 'JetBrains Mono, monospace',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PRESET_NAMES = Object.keys(STRATEGY_TEMPLATES)

function InstrumentSelector({ active, onChange }: { active: Instrument; onChange: (v: Instrument) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(['NIFTY', 'BANKNIFTY'] as Instrument[]).map((sym) => (
        <button key={sym} onClick={() => onChange(sym)} style={{
          flex: 1, padding: '7px 0', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem',
          cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
          background: active === sym ? 'var(--accent)'  : 'var(--surface2)',
          color:      active === sym ? '#0a0c10'        : 'var(--text2)',
          borderColor: active === sym ? 'var(--accent)' : 'var(--border)',
        }}>{sym}</button>
      ))}
    </div>
  )
}

function SpotCard({ instrument, spotData, loading, hasLoaded }: { instrument: Instrument; spotData: SpotData | null; loading: boolean; hasLoaded: boolean }) {
  // Only show loading state on initial load, not during background refreshes
  if (!hasLoaded && (loading || !spotData)) {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)', animation: 'pulse 1.2s infinite' }} />
        <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>Fetching spot…</span>
      </div>
    )
  }
  
  // If we've loaded once but don't have data yet, show placeholder
  if (!spotData) {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>No spot data available</span>
      </div>
    )
  }
  const pos = spotData.change >= 0
  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: 2 }}>{instrument} SPOT</div>
        <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          ₹{fmtINR(spotData.spot)}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: pos ? 'var(--green)' : 'var(--red)' }}>
          {pos ? '+' : ''}{spotData.change.toFixed(2)}
        </div>
        <div className="mono" style={{ fontSize: '0.78rem', color: pos ? 'var(--green)' : 'var(--red)', opacity: 0.8 }}>
          ({pos ? '+' : ''}{spotData.changePct.toFixed(2)}%)
        </div>
      </div>
    </div>
  )
}

function ExpirySelect({ expiry, expiries, onChange, loading }: {
  expiry: string; expiries: string[]; onChange: (v: string) => void; loading: boolean
}) {
  return (
    <div>
      <label style={labelStyle}>Expiry</label>
      <select value={expiry} onChange={(e) => onChange(e.target.value)}
        disabled={loading || expiries.length === 0}
        style={{ ...inputStyle, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
        {expiries.length === 0
          ? <option value="">Loading…</option>
          : expiries.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
    </div>
  )
}


function BuildTab({
  formType, setFormType, formStrike, setFormStrike,
  formLots, setFormLots, formLTP, setFormLTP,
  formSide, setFormSide, chainLoading, onAdd,
}: {
  formType: OptionType;    setFormType:   (v: OptionType) => void
  formStrike: number;      setFormStrike: (v: number) => void
  formLots: number;        setFormLots:   (v: number) => void
  formLTP: string;         setFormLTP:    (v: string) => void
  formSide: Side;          setFormSide:   (v: Side) => void
  chainLoading: boolean
  onAdd: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['CE', 'PE', 'FUT'] as OptionType[]).map((t) => (
            <button key={t} onClick={() => setFormType(t)} style={{
              flex: 1, padding: '6px 0', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700,
              cursor: 'pointer', border: '1px solid', transition: 'all 0.12s',
              background: formType === t
                ? t === 'CE' ? 'rgba(0,212,170,0.15)' : t === 'PE' ? 'rgba(255,77,106,0.15)' : 'rgba(0,153,255,0.15)'
                : 'var(--surface)',
              color: formType === t
                ? t === 'CE' ? 'var(--green)' : t === 'PE' ? 'var(--red)' : 'var(--accent2)'
                : 'var(--text3)',
              borderColor: formType === t
                ? t === 'CE' ? 'var(--green)' : t === 'PE' ? 'var(--red)' : 'var(--accent2)'
                : 'var(--border)',
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={labelStyle}>Strike</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setFormStrike(formStrike - 50)} style={{ ...stepBtn }}>−50</button>
          <div className="mono" style={{
            flex: 1, textAlign: 'center', padding: '6px 0', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
          }}>
            {formStrike.toLocaleString('en-IN')}
          </div>
          <button onClick={() => setFormStrike(formStrike + 50)} style={{ ...stepBtn }}>+50</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Lots</label>
          <input type="number" min={1} max={50} value={formLots}
            onChange={(e) => setFormLots(Math.max(1, Math.min(50, Number(e.target.value))))}
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
        </div>
        <div>
          <label style={labelStyle}>LTP (₹){chainLoading ? ' …' : ''}</label>
          <input type="number" value={formLTP} onChange={(e) => setFormLTP(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Side</label>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(['BUY', 'SELL'] as Side[]).map((s) => (
            <button key={s} onClick={() => setFormSide(s)} style={{
              flex: 1, padding: '7px 0', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              border: 'none', transition: 'all 0.12s',
              background: formSide === s ? (s === 'BUY' ? 'var(--green)' : 'var(--red)') : 'var(--surface)',
              color: formSide === s ? '#0a0c10' : 'var(--text3)',
            }}>{s}</button>
          ))}
        </div>
      </div>
      <button onClick={onAdd} disabled={Number(formLTP) <= 0} style={{
        padding: '9px 0', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem',
        cursor: Number(formLTP) > 0 ? 'pointer' : 'default',
        background: Number(formLTP) > 0 ? 'var(--accent)' : 'var(--surface2)',
        color: Number(formLTP) > 0 ? '#0a0c10' : 'var(--text3)',
        border: 'none', letterSpacing: '0.04em', transition: 'all 0.15s',
      }}>
        {Number(formLTP) > 0 ? '+ Add Leg' : 'Enter LTP to add'}
      </button>
    </div>
  )
}

function StrategiesGrid({ onSelect }: { onSelect: (strategy: Strategy) => void }) {
  type StrategyCategory = 'bullish' | 'bearish' | 'neutral'
  const [activeCategory, setActiveCategory] = useState<StrategyCategory>('bullish')

  const categories: Array<{ key: StrategyCategory; label: string; emoji: string; color: string }> = [
    { key: 'bullish', label: 'Bullish', emoji: '🟢', color: 'var(--green)' },
    { key: 'bearish', label: 'Bearish', emoji: '🔴', color: 'var(--red)' },
    { key: 'neutral', label: 'Non-Directional', emoji: '🟡', color: 'var(--yellow)' },
  ]

  const strategies = getStrategiesByCategory(activeCategory)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {categories.map(({ key, label, emoji, color }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeCategory === key ? `2px solid ${color}` : '2px solid transparent',
              color: activeCategory === key ? 'var(--text)' : 'var(--text3)',
              fontSize: '0.75rem',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Strategy Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        maxHeight: 400,
        overflowY: 'auto',
        paddingRight: 4,
      }}>
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            onClick={() => onSelect(strategy)}
          />
        ))}
      </div>
    </div>
  )
}

function PositionRow({ leg, onRemove }: { leg: StoreLeg; onRemove: (id: number) => void }) {
  const isBuy = leg.side === 'BUY'
  return (
    <div style={{ ...card, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        padding: '2px 7px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
        background: isBuy ? 'rgba(0,212,170,0.15)' : 'rgba(255,77,106,0.15)',
        color: isBuy ? 'var(--green)' : 'var(--red)',
      }}>{leg.side}</span>
      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1 }}>
        {leg.strike.toLocaleString('en-IN')}
        <span style={{ color: 'var(--text3)', marginLeft: 3 }}>{leg.type}</span>
      </span>
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
        ₹{leg.ltp.toFixed(2)}
      </span>
      <span className="mono" style={{ fontSize: '0.73rem', color: 'var(--text3)' }}>{leg.lots}L</span>
      <button onClick={() => onRemove(leg.id)} style={{
        background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
        fontSize: '0.9rem', padding: '0 2px', lineHeight: 1,
      }}>×</button>
    </div>
  )
}

interface SummaryProps {
  maxProfit: number; maxLoss: number; breakevens: number[]
  netPremium: number; hasLegs: boolean
}
function SummaryBar({ maxProfit, maxLoss, breakevens, netPremium, hasLegs }: SummaryProps) {
  const rr = hasLegs && maxLoss < 0 ? (Math.abs(maxProfit / maxLoss)).toFixed(1) : null
  const beStr = breakevens.length > 0 ? breakevens.map((b) => fmtINR(b)).join(' / ') : '—'
  const items = [
    { label: 'Max Profit',    value: hasLegs ? fmtPnl(maxProfit) : '—', color: hasLegs && maxProfit > 0 ? 'var(--green)' : 'var(--text)' },
    { label: 'Max Loss',      value: hasLegs ? fmtPnl(maxLoss)   : '—', color: hasLegs && maxLoss   < 0 ? 'var(--red)'   : 'var(--text)' },
    { label: 'Breakeven',     value: hasLegs ? beStr : '—',             color: 'var(--text)' },
    { label: 'Net Premium',   value: hasLegs ? fmtPnl(netPremium) : '—', color: hasLegs ? (netPremium >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text)' },
    { label: 'Risk / Reward', value: rr ? `1 : ${rr}` : '—',            color: 'var(--text)' },
  ]
  return (
    <div style={{ display: 'flex', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{ flex: 1, background: 'var(--surface)', padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>
            {label}
          </div>
          <div className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

interface PosGreeks { delta: number; gamma: number; theta: number; vega: number }
function GreeksPanel({ g, hasLegs }: { g: PosGreeks; hasLegs: boolean }) {
  const items = [
    { label: 'Delta', value: hasLegs ? g.delta.toFixed(2) : '—',  sub: 'position',   color: 'var(--accent2)' },
    { label: 'Theta', value: hasLegs ? fmtPnl(g.theta) : '—',     sub: '₹ / day',    color: 'var(--red)'    },
    { label: 'Vega',  value: hasLegs ? fmtPnl(g.vega) : '—',      sub: '₹ / 1% IV',  color: 'var(--yellow)' },
    { label: 'Gamma', value: hasLegs ? g.gamma.toFixed(4) : '—',  sub: 'delta / ₹1', color: 'var(--purple)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, flexShrink: 0 }}>
      {items.map(({ label, value, sub, color }) => (
        <div key={label} style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
            {label}
          </div>
          <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text3)', opacity: 0.8 }}>{sub}</div>
        </div>
      ))}
    </div>
  )
}

interface SaveModalProps {
  isOpen: boolean; name: string; saving: boolean; error: string | null
  onNameChange: (v: string) => void; onSave: () => void; onClose: () => void
}
function SaveModal({ isOpen, name, saving, error, onNameChange, onSave, onClose }: SaveModalProps) {
  if (!isOpen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
      <div style={{ ...card, width: 340, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Save Strategy</h3>
        <div>
          <label style={labelStyle}>Strategy Name</label>
          <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Bull Call Spread Nifty May" style={{ ...inputStyle }}
            onKeyDown={(e) => e.key === 'Enter' && onSave()} autoFocus />
        </div>
        {error && <div style={{ marginTop: 8, color: 'var(--red)', fontSize: '0.78rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
            background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)',
            fontWeight: 600, fontSize: '0.82rem',
          }}>Cancel</button>
          <button onClick={onSave} disabled={!name.trim() || saving} style={{
            flex: 2, padding: '8px 0', borderRadius: 6,
            cursor: name.trim() && !saving ? 'pointer' : 'default',
            background: name.trim() && !saving ? 'var(--accent)' : 'var(--surface2)',
            color: name.trim() && !saving ? '#0a0c10' : 'var(--text3)',
            border: 'none', fontWeight: 700, fontSize: '0.82rem',
          }}>{saving ? 'Saving…' : 'Save Strategy'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StrategyBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, session } = useAuthStore()
  const {
    instrument, spotData, expiriesData, selectedExpiry, chainData, legs,
    isLoading, hasLoadedOnce, error, clearError, setInstrument, setExpiry, addLeg, removeLeg, clearLegs, setLegs,
    fetchSpotAndExpiries,
  } = useStrategyStore()

  const [activeTab,  setActiveTab]  = useState<ActiveTab>('build')
  const [formType,   setFormType]   = useState<OptionType>('CE')
  const [formStrike, setFormStrike] = useState(22000)
  const [formLots,   setFormLots]   = useState(1)
  const [formLTP,    setFormLTP]    = useState('0')
  const [formIV,     setFormIV]     = useState(0.15)
  const [formSide,   setFormSide]   = useState<Side>('BUY')
  const [saveModal,  setSaveModal]  = useState({ open: false, name: '', saving: false, saveError: null as string | null })
  const [strategyModal, setStrategyModal] = useState<{ open: boolean; strategy: Strategy | null }>({ open: false, strategy: null })

  // Load strategy from URL params (from Portfolio)
  useEffect(() => {
    const instrumentParam = searchParams.get('instrument')
    const legsParam = searchParams.get('legs')
    
    if (instrumentParam && legsParam) {
      try {
        const parsedLegs = JSON.parse(legsParam)
        if (instrumentParam === 'NIFTY' || instrumentParam === 'BANKNIFTY') {
          setInstrument(instrumentParam)
          setLegs(parsedLegs)
        }
      } catch (err) {
        console.error('Failed to parse legs from URL:', err)
      }
    }
  }, [searchParams, setInstrument, setLegs])

  // Initial fetch
  useEffect(() => { fetchSpotAndExpiries(instrument) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh spot every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSpotAndExpiries(instrument)
    }, 30_000)
    return () => clearInterval(interval)
  }, [instrument, fetchSpotAndExpiries])

  // Sync form strike to ATM when spot arrives
  useEffect(() => {
    if (spotData?.spot) setFormStrike(getATM(spotData.spot, instrument))
  }, [spotData?.spot, instrument])

  // Handle instrument change: clear legs and chart
  function handleInstrumentChange(newInstrument: Instrument) {
    clearLegs()
    setInstrument(newInstrument)
  }

  // Auto-fill LTP + IV from chain when strike or type changes
  useEffect(() => {
    const ltp = getLTPFromChain(chainData, formStrike, formType)
    if (ltp > 0) setFormLTP(ltp.toFixed(2))
    setFormIV(getIVFromChain(chainData, formStrike, formType))
  }, [formStrike, formType, chainData])

  // Derived
  const spot    = spotData?.spot ?? 0
  const lotSize = LOT_SIZES[instrument]
  const step    = STEP_SIZES[instrument]
  const allExpiries = Array.from(new Set([
    ...(expiriesData?.weekly ?? []),
    ...(expiriesData?.monthly ?? []),
  ])).sort()

  const payoffLegs = useMemo<PayoffLeg[]>(() =>
    legs.filter((l) => l.type !== 'FUT').map((l) => ({
      type: l.type as 'CE' | 'PE', action: l.side, strike: l.strike,
      premium: l.ltp, lots: l.lots,
    })), [legs])

  const payoffData = useMemo(() =>
    spot > 0 && payoffLegs.length > 0
      ? calcPayoffRange(payoffLegs, spot * 0.85, spot * 1.15, step, lotSize)
      : [], [payoffLegs, spot, step, lotSize])

  const breakevens = useMemo(() =>
    spot > 0 && payoffLegs.length > 0
      ? calcBreakevens(payoffLegs, spot, lotSize)
      : [], [payoffLegs, spot, lotSize])

  const maxProfit = useMemo(() =>
    spot > 0 && payoffLegs.length > 0
      ? calcMaxProfit(payoffLegs, spot * 0.85, spot * 1.15, lotSize)
      : 0, [payoffLegs, spot, lotSize])

  const maxLoss = useMemo(() =>
    spot > 0 && payoffLegs.length > 0
      ? calcMaxLoss(payoffLegs, spot * 0.85, spot * 1.15, lotSize)
      : 0, [payoffLegs, spot, lotSize])

  const netPremium = useMemo(() =>
    legs.reduce((sum, l) => sum + (l.side === 'BUY' ? -1 : 1) * l.ltp * l.lots * lotSize, 0),
    [legs, lotSize])

  const posGreeks = useMemo<PosGreeks>(() => {
    if (!spot) return { delta: 0, gamma: 0, theta: 0, vega: 0 }
    return legs.reduce((acc, l) => {
      if (l.type === 'FUT') return acc
      const T = daysToExpiry(l.expiry) / 365
      const sigma = l.iv ?? 0.15
      if (T <= 0 || sigma <= 0) return acc
      const g = calcGreeks({ S: spot, K: l.strike, T, r: RISK_FREE_RATE, sigma, type: l.type as 'CE' | 'PE' })
      const scale = (l.side === 'BUY' ? 1 : -1) * l.lots * lotSize
      return { delta: acc.delta + g.delta * scale, gamma: acc.gamma + g.gamma * scale,
               theta: acc.theta + g.theta * scale, vega:  acc.vega  + g.vega  * scale }
    }, { delta: 0, gamma: 0, theta: 0, vega: 0 })
  }, [legs, spot, lotSize])

  function applyPreset(strategy: Strategy) {
    setStrategyModal({ open: true, strategy })
  }

  function handleLoadStrategy(legs: Array<{ type: OptionType; strike: number; expiry: string; lots: number; ltp: number; side: Side }>) {
    // Don't clear existing legs - add new ones
    legs.forEach(leg => {
      addLeg({
        type: leg.type,
        strike: leg.strike,
        expiry: leg.expiry,
        lots: leg.lots,
        ltp: leg.ltp,
        side: leg.side,
        iv: 0.15, // Default IV
      })
    })
  }

  function handleAddLeg() {
    if (Number(formLTP) <= 0) return
    addLeg({ type: formType, expiry: selectedExpiry, strike: formStrike,
              lots: formLots, ltp: Number(formLTP), side: formSide, iv: formIV })
  }

  async function handleSave() {
    if (!user || !session) { navigate('/login'); return }
    setSaveModal((m) => ({ ...m, open: true }))
  }

  async function confirmSave() {
    if (!saveModal.name.trim() || !session) return
    setSaveModal((m) => ({ ...m, saving: true, saveError: null }))
    try {
      await saveStrategy({ 
        name: saveModal.name.trim(), 
        instrument, 
        legs: legs.map(l => ({ type: l.type, strike: l.strike, expiry: l.expiry, side: l.side, lots: l.lots, ltp: l.ltp })),
        notes: null 
      }, session.access_token)
      setSaveModal({ open: false, name: '', saving: false, saveError: null })
      // Show success message
      alert('Strategy saved successfully!')
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Save failed'
      // Check if it's a database configuration error
      if (errorMsg.includes('Database not configured') || errorMsg.includes('503')) {
        setSaveModal((m) => ({ 
          ...m, 
          saving: false, 
          saveError: 'Save feature requires database setup. For now, you can take a screenshot or export your strategy manually.' 
        }))
      } else {
        setSaveModal((m) => ({ ...m, saving: false, saveError: errorMsg }))
      }
    }
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'build',      label: 'Build'      },
    { key: 'strategies', label: 'Strategies' },
    { key: 'chain',      label: 'Chain'      },
  ]

  return (
    <>
      <SaveModal
        isOpen={saveModal.open} name={saveModal.name} saving={saveModal.saving}
        error={saveModal.saveError}
        onNameChange={(v) => setSaveModal((m) => ({ ...m, name: v }))}
        onSave={confirmSave}
        onClose={() => setSaveModal({ open: false, name: '', saving: false, saveError: null })}
      />

      <StrategyModal
        isOpen={strategyModal.open}
        strategy={strategyModal.strategy}
        instrument={instrument}
        spot={spot || 0}
        selectedExpiry={selectedExpiry}
        expiries={allExpiries}
        chainData={chainData}
        onLoad={handleLoadStrategy}
        onClose={() => setStrategyModal({ open: false, strategy: null })}
      />

      {/* Error banner */}
      {error && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 40,
          background: 'var(--red)', color: '#fff', padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>⚠️ {error}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchSpotAndExpiries(instrument)} style={{
              padding: '4px 12px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer',
            }}>Retry</button>
            <button onClick={clearError} style={{
              padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem',
              background: 'none', color: '#fff', border: 'none', cursor: 'pointer',
            }}>×</button>
          </div>
        </div>
      )}

      <div style={{
        height: 'calc(100vh - 56px)', overflow: 'hidden', gap: 1, background: 'var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="strategy-builder-layout"
      >
        {/* ── Left panel ── */}
        <div className="strategy-left-panel" style={{
          background: 'var(--surface)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto',
        }}>
          <InstrumentSelector active={instrument} onChange={handleInstrumentChange} />
          <SpotCard instrument={instrument} spotData={spotData} loading={isLoading.spot} hasLoaded={hasLoadedOnce.spot} />
          <ExpirySelect
            expiry={selectedExpiry} expiries={allExpiries}
            onChange={setExpiry} loading={isLoading.expiries}
          />

          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderRadius: 6, 
            overflow: 'hidden', 
            border: '1px solid var(--border)',
            minHeight: 32,
            flexShrink: 0,
          }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                flex: 1, 
                padding: '7px 0', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                border: 'none', 
                transition: 'all 0.12s',
                background: activeTab === key ? 'var(--accent)' : 'var(--surface2)',
                color:      activeTab === key ? '#0a0c10'       : 'var(--text3)',
              }}>{label}</button>
            ))}
          </div>

          {activeTab === 'build' && (
            <BuildTab
              formType={formType}     setFormType={setFormType}
              formStrike={formStrike} setFormStrike={setFormStrike}
              formLots={formLots}     setFormLots={setFormLots}
              formLTP={formLTP}       setFormLTP={setFormLTP}
              formSide={formSide}     setFormSide={setFormSide}
              chainLoading={isLoading.chain}
              onAdd={handleAddLeg}
            />
          )}
          {activeTab === 'strategies' && (
            <StrategiesGrid onSelect={applyPreset} />
          )}
          {activeTab === 'chain' && (
            <div style={{ color: 'var(--text3)', fontSize: '0.82rem', textAlign: 'center', padding: '32px 0' }}>
              Option chain tab coming soon
            </div>
          )}

          {/* Legs list */}
          {legs.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Legs ({legs.length})
                </span>
                <button onClick={clearLegs} style={{
                  background: 'none', border: 'none', color: 'var(--red)', fontSize: '0.7rem',
                  cursor: 'pointer', fontWeight: 600,
                }}>Clear all</button>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 220 }}>
                {legs.map((leg) => <PositionRow key={leg.id} leg={leg} onRemove={removeLeg} />)}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="strategy-right-panel" style={{
          background: 'var(--surface)', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
          flex: 1,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <SummaryBar maxProfit={maxProfit} maxLoss={maxLoss} breakevens={breakevens}
              netPremium={netPremium} hasLegs={legs.length > 0} />
            <button onClick={handleSave} disabled={legs.length === 0} style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 6,
              fontWeight: 700, fontSize: '0.82rem', cursor: legs.length > 0 ? 'pointer' : 'default',
              background: legs.length > 0 ? 'var(--accent)' : 'var(--surface2)',
              color: legs.length > 0 ? '#0a0c10' : 'var(--text3)', border: 'none',
            }}>Save</button>
          </div>
          <PayoffChart data={payoffData} spot={spot} breakevens={breakevens} />
          <GreeksPanel g={posGreeks} hasLegs={legs.length > 0} />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .strategy-builder-layout {
            flex-direction: row !important;
          }
          .strategy-left-panel {
            width: 340px;
            flex-shrink: 0;
          }
          .strategy-right-panel {
            min-width: 0;
          }
        }
        @media (max-width: 767px) {
          .strategy-builder-layout {
            flex-direction: column-reverse !important;
          }
          .strategy-left-panel {
            max-height: 60vh;
            overflow-y: auto;
          }
          .strategy-right-panel {
            min-height: 40vh;
          }
        }
      `}</style>
    </>
  )
}
