import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PayoffPoint } from '../utils/payoff'

interface Props {
  data: PayoffPoint[]
  spot: number
  breakevens: number[]
}

function fmt(v: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(v)
}

function fmtPnl(v: number) {
  const abs = Math.abs(v)
  const prefix = v >= 0 ? '+₹' : '-₹'
  if (abs >= 1_00_000) return prefix + fmt(abs / 1_00_000) + 'L'
  if (abs >= 1000)     return prefix + fmt(abs / 1000) + 'k'
  return prefix + fmt(abs)
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  const pnl = payload[0].value
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '6px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem',
    }}>
      <div style={{ color: 'var(--text2)', marginBottom: 2 }}>
        ₹{label !== undefined ? fmt(label) : '—'}
      </div>
      <div style={{ fontWeight: 700, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {fmtPnl(pnl)}
      </div>
    </div>
  )
}

export default function PayoffChart({ data, spot, breakevens }: Props) {
  if (data.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 240, background: 'var(--surface2)',
        border: '1px solid var(--border)', borderRadius: 8, position: 'relative', overflow: 'hidden',
      }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07 }}
          preserveAspectRatio="none">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%"
              stroke="var(--text3)" strokeWidth="1" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16.6}%`} x2="100%" y2={`${(i + 1) * 16.6}%`}
              stroke="var(--text3)" strokeWidth="1" />
          ))}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--border)" strokeWidth="2" />
        </svg>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8, opacity: 0.2 }}>📈</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text3)', fontWeight: 600 }}>Payoff Diagram</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4, opacity: 0.7 }}>
            Add legs to visualise expiry P&amp;L
          </div>
        </div>
      </div>
    )
  }

  const maxPnl = Math.max(...data.map((d) => d.pnl))
  const minPnl = Math.min(...data.map((d) => d.pnl))
  const range  = maxPnl - minPnl
  const zeroFraction = range > 0 ? maxPnl / range : 0.5
  const gradId = 'pnlGrad'

  return (
    <div style={{ flex: 1, minHeight: 240, maxHeight: 500, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset={Math.max(0, Math.min(zeroFraction - 0.001, 1))}
                stopColor="#00d4aa" stopOpacity={0.18} />
              <stop offset={Math.max(0, Math.min(zeroFraction, 1))}
                stopColor="#00d4aa" stopOpacity={0} />
              <stop offset={Math.max(0, Math.min(zeroFraction, 1))}
                stopColor="#ff4d6a" stopOpacity={0} />
              <stop offset={Math.max(0, Math.min(zeroFraction + 0.001, 1))}
                stopColor="#ff4d6a" stopOpacity={0.18} />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset={Math.max(0, Math.min(zeroFraction, 1))} stopColor="#00d4aa" />
              <stop offset={Math.max(0, Math.min(zeroFraction, 1))} stopColor="#ff4d6a" />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="spot"
            tickFormatter={fmt}
            tick={{ fill: 'var(--text3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtPnl}
            tick={{ fill: 'var(--text3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text3)', strokeWidth: 1, strokeDasharray: '4 4' }} />

          <ReferenceLine y={0} stroke="var(--text3)" strokeWidth={1} strokeOpacity={0.6} />

          {spot > 0 && (
            <ReferenceLine
              x={spot}
              stroke="var(--accent2)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              label={{ value: fmt(spot), position: 'insideTopRight', fill: 'var(--accent2)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
            />
          )}

          {breakevens.map((be) => (
            <ReferenceDot
              key={be} x={be} y={0}
              r={5} fill="var(--yellow)" stroke="var(--surface)" strokeWidth={2}
            />
          ))}

          <Area
            type="monotone"
            dataKey="pnl"
            stroke="url(#lineGrad)"
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
