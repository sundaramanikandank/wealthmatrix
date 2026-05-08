import { useState, useEffect, useRef } from 'react'
import type { Strategy, StrategyLeg } from '../data/strategies'
import type { Instrument, OptionType, Side } from '../store/strategyStore'
import { calculateATM } from '../data/strategies'

interface EditableLeg extends StrategyLeg {
  id: number
  strike: number
  expiry: string
  ltp: number
}

interface Props {
  isOpen: boolean
  strategy: Strategy | null
  instrument: Instrument
  spot: number
  selectedExpiry: string
  expiries: string[]
  chainData: any
  onLoad: (legs: EditableLeg[]) => void
  onClose: () => void
}

// Helper function to estimate LTP from chain data
function estimateLTP(leg: StrategyLeg, strike: number, chainData: Record<string, unknown> | null): number {
  if (!chainData?.chain) return 50

  const chain = chainData.chain as Record<number, { ce: { lastPrice?: number } | null; pe: { lastPrice?: number } | null }>
  const row = chain[strike]
  if (!row) return 50

  const option = leg.type === 'CE' ? row.ce : row.pe
  return option?.lastPrice || 50
}

export default function StrategyModal({
  isOpen,
  strategy,
  instrument,
  spot,
  selectedExpiry,
  expiries,
  chainData,
  onLoad,
  onClose,
}: Props) {
  const [legs, setLegs] = useState<EditableLeg[]>([])
  const idCounterRef = useRef(0)
  const baseIdRef = useRef(0)

  useEffect(() => {
    if (!strategy || !isOpen) return

    const atm = calculateATM(spot, instrument)
    // Create a unique base ID for this strategy + opening
    baseIdRef.current = Date.now() + Math.random() * 10000
    idCounterRef.current = 0

    const editableLegs: EditableLeg[] = strategy.legs.map((leg) => {
      const strike = atm + leg.strikeOffset
      const ltp = estimateLTP(leg, strike, chainData)

      return {
        ...leg,
        id: baseIdRef.current + idCounterRef.current++,
        strike,
        expiry: selectedExpiry,
        ltp,
      }
    })

    setLegs(editableLegs)
  }, [strategy, isOpen, spot, instrument, selectedExpiry, chainData])

  if (!isOpen || !strategy) return null

  const stepSize = instrument === 'NIFTY' ? 50 : 100

  function updateLeg(id: number, field: keyof EditableLeg, value: string | number) {
    setLegs(legs.map(leg => 
      leg.id === id ? { ...leg, [field]: value } : leg
    ))
  }

  function deleteLeg(id: number) {
    setLegs(legs.filter(leg => leg.id !== id))
  }

  function addLeg() {
    const atm = calculateATM(spot, instrument)
    setLegs([
      ...legs,
      {
        id: baseIdRef.current + idCounterRef.current++,
        type: 'CE',
        strikeOffset: 0,
        side: 'BUY',
        lots: 1,
        strike: atm,
        expiry: selectedExpiry,
        ltp: 50,
      },
    ])
  }

  function handleLoad() {
    onLoad(legs)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border2)',
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Title */}
        <h3 style={{
          margin: 0,
          marginBottom: 16,
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text)',
        }}>
          {strategy.name}
        </h3>

        {/* Description */}
        <p style={{
          margin: 0,
          marginBottom: 20,
          fontSize: '0.85rem',
          color: 'var(--text2)',
        }}>
          {strategy.description}
        </p>

        {/* Legs Table */}
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>Type</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>Strike</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>Expiry</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>Lots</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>LTP</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--text3)' }}>B/S</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text3)' }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg) => (
                <tr key={leg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 4px' }}>
                    <select
                      value={leg.type}
                      onChange={(e) => updateLeg(leg.id, 'type', e.target.value as OptionType)}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        width: '100%',
                      }}
                    >
                      <option value="CE">CE</option>
                      <option value="PE">PE</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <input
                      type="number"
                      value={leg.strike}
                      onChange={(e) => updateLeg(leg.id, 'strike', Number(e.target.value))}
                      step={stepSize}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        width: '80px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <select
                      value={leg.expiry}
                      onChange={(e) => updateLeg(leg.id, 'expiry', e.target.value)}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        width: '100%',
                      }}
                    >
                      {expiries.map((exp) => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <input
                      type="number"
                      value={leg.lots}
                      onChange={(e) => updateLeg(leg.id, 'lots', Number(e.target.value))}
                      min={1}
                      max={50}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        width: '50px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <input
                      type="number"
                      value={leg.ltp}
                      onChange={(e) => updateLeg(leg.id, 'ltp', Number(e.target.value))}
                      step={0.05}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: 'var(--text)',
                        fontSize: '0.8rem',
                        width: '70px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 4px' }}>
                    <select
                      value={leg.side}
                      onChange={(e) => updateLeg(leg.id, 'side', e.target.value as Side)}
                      style={{
                        background: 'var(--surface3)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '4px 6px',
                        color: leg.side === 'BUY' ? 'var(--green)' : 'var(--red)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        width: '100%',
                      }}
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <button
                      onClick={() => deleteLeg(leg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--red)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: 4,
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Leg Button */}
        <button
          onClick={addLeg}
          style={{
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 12px',
            color: 'var(--text2)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          + Add Leg
        </button>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface3)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px 20px',
              color: 'var(--text2)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={legs.length === 0}
            style={{
              background: legs.length > 0 ? 'var(--accent)' : 'var(--surface3)',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              color: legs.length > 0 ? '#0a0c10' : 'var(--text3)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: legs.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Load Strategy
          </button>
        </div>
      </div>
    </div>
  )
}
