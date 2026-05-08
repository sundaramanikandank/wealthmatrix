import type { Strategy } from '../data/strategies'
import PayoffMiniChart from './PayoffMiniChart'

interface Props {
  strategy: Strategy
  onClick: () => void
}

export default function StrategyCard({ strategy, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 190,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,170,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Strategy Name */}
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text)',
        flexShrink: 0,
      }}>
        {strategy.name}
      </div>

      {/* Description */}
      <div style={{
        fontSize: 10,
        color: 'var(--text2)',
        lineHeight: 1.3,
        flexShrink: 0,
      }}>
        {strategy.description}
      </div>

      {/* Risk/Reward Pills */}
      <div style={{ 
        display: 'flex', 
        gap: 6, 
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9,
          padding: '3px 6px',
          borderRadius: 4,
          background: strategy.risk === 'Limited' 
            ? 'rgba(0,212,170,0.12)' 
            : 'rgba(255,77,106,0.12)',
          color: strategy.risk === 'Limited' 
            ? 'var(--green)' 
            : 'var(--red)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          Risk: {strategy.risk}
        </span>
        <span style={{
          fontSize: 9,
          padding: '3px 6px',
          borderRadius: 4,
          background: strategy.reward === 'Limited' 
            ? 'rgba(255,77,106,0.12)' 
            : 'rgba(0,212,170,0.12)',
          color: strategy.reward === 'Limited' 
            ? 'var(--red)' 
            : 'var(--green)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          Reward: {strategy.reward}
        </span>
      </div>

      {/* Mini Payoff Chart */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 50,
        overflow: 'hidden',
      }}>
        <PayoffMiniChart points={strategy.svgPoints} />
      </div>
    </div>
  )
}
