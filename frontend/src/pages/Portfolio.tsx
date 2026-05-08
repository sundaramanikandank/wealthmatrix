import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

type Tab = 'strategies' | 'paper' | 'history'

interface Strategy {
  id: string
  name: string
  instrument: string
  legs: StoredLeg[]
  notes: string | null
  created_at: string
}

interface StoredLeg {
  type: string
  strike: number
  expiry: string
  side: string
  lots: number
  ltp: number
}

interface PaperPosition {
  id: string
  strategy_name: string
  instrument: string
  legs: StoredLeg[]
  entry_premium: number | null
  entry_date: string
  exit_premium: number | null
  exit_date: string | null
  status: string
  notes: string | null
}

export default function Portfolio() {
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('strategies')
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [paperPositions, setPaperPositions] = useState<PaperPosition[]>([])
  const [closedPositions, setClosedPositions] = useState<PaperPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPaperModal, setShowPaperModal] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [entryPremium, setEntryPremium] = useState('')

  // Fetch strategies
  async function fetchStrategies() {
    if (!session) return
    setLoading(true)
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/strategies', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (response.ok) {
        setStrategies(result.data || [])
      } else {
        setError(result.error || 'Failed to fetch strategies')
      }
    } catch (err) {
      setError('Failed to fetch strategies')
    } finally {
      setLoading(false)
    }
  }

  // Fetch paper positions
  async function fetchPaperPositions() {
    if (!session) return
    setLoading(true)
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/paper?status=open', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (response.ok) {
        setPaperPositions(result.data || [])
      }
    } catch (err) {
      setError('Failed to fetch paper positions')
    } finally {
      setLoading(false)
    }
  }

  // Fetch closed positions
  async function fetchClosedPositions() {
    if (!session) return
    setLoading(true)
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/paper?status=closed', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const result = await response.json()
      if (response.ok) {
        setClosedPositions(result.data || [])
      }
    } catch (err) {
      setError('Failed to fetch closed positions')
    } finally {
      setLoading(false)
    }
  }

  // Delete strategy
  async function deleteStrategy(id: string) {
    if (!confirm('Are you sure you want to delete this strategy?')) return
    if (!session) return
    
    try {
      const response = await fetch(`http://localhost:4000/api/portfolio/strategies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (response.ok) {
        setStrategies(strategies.filter(s => s.id !== id))
      }
    } catch (err) {
      setError('Failed to delete strategy')
    }
  }

  // Load strategy in builder
  function loadStrategy(strategy: Strategy) {
    const params = new URLSearchParams({
      instrument: strategy.instrument,
      legs: JSON.stringify(strategy.legs),
    })
    navigate(`/strategy-builder?${params.toString()}`)
  }

  // Create paper position
  async function createPaperPosition() {
    if (!session || !selectedStrategy || !entryPremium) return
    
    try {
      const response = await fetch('http://localhost:4000/api/portfolio/paper', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy_name: selectedStrategy.name,
          instrument: selectedStrategy.instrument,
          legs: selectedStrategy.legs,
          entry_premium: parseFloat(entryPremium),
        }),
      })
      
      if (response.ok) {
        setShowPaperModal(false)
        setSelectedStrategy(null)
        setEntryPremium('')
        fetchPaperPositions()
      } else {
        setError('Failed to create paper position')
      }
    } catch (err) {
      setError('Failed to create paper position')
    }
  }

  // Close paper position
  async function closePosition(id: string, exitPremium: number) {
    if (!session) return
    
    try {
      const response = await fetch(`http://localhost:4000/api/portfolio/paper/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'closed',
          exit_premium: exitPremium,
          exit_date: new Date().toISOString(),
        }),
      })
      
      if (response.ok) {
        fetchPaperPositions()
      } else {
        setError('Failed to close position')
      }
    } catch (err) {
      setError('Failed to close position')
    }
  }

  useEffect(() => {
    if (activeTab === 'strategies') fetchStrategies()
    else if (activeTab === 'paper') fetchPaperPositions()
    else if (activeTab === 'history') fetchClosedPositions()
  }, [activeTab, session])

  const tabStyle = (tab: Tab) => ({
    padding: '10px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none',
    color: activeTab === tab ? 'var(--accent)' : 'var(--text3)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Portfolio</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
        <button onClick={() => setActiveTab('strategies')} style={tabStyle('strategies')}>Saved Strategies</button>
        <button onClick={() => setActiveTab('paper')} style={tabStyle('paper')}>Paper Portfolio</button>
        <button onClick={() => setActiveTab('history')} style={tabStyle('history')}>History</button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'var(--red)', color: '#fff' }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'strategies' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>
            ) : strategies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No strategies saved yet</p>
                <p style={{ fontSize: '0.85rem' }}>Create one in Strategy Builder and save it!</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>NAME</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>INSTRUMENT</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>LEGS</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>CREATED</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>NOTES</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map(strategy => (
                    <tr key={strategy.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <button
                          onClick={() => loadStrategy(strategy)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent2)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'underline',
                          }}
                        >
                          {strategy.name}
                        </button>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: strategy.instrument === 'NIFTY' ? 'rgba(0,212,170,0.1)' : 'rgba(255,159,67,0.1)',
                          color: strategy.instrument === 'NIFTY' ? 'var(--accent)' : 'var(--yellow)',
                        }}>
                          {strategy.instrument}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)' }}>
                        {strategy.legs.length} legs
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)' }}>
                        {new Date(strategy.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text3)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {strategy.notes || '—'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <button
                          onClick={() => deleteStrategy(strategy.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--red)',
                            background: 'none',
                            color: 'var(--red)',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'paper' && (
          <div>
            <button
              onClick={() => setShowPaperModal(true)}
              style={{
                padding: '8px 16px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent)',
                color: '#0a0c10',
                cursor: 'pointer',
              }}
            >
              + Add Paper Position
            </button>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>
            ) : paperPositions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No active paper positions</p>
                <p style={{ fontSize: '0.85rem' }}>Add a position to start paper trading!</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>STRATEGY</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>INSTRUMENT</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>ENTRY DATE</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>ENTRY PREMIUM</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paperPositions.map(position => (
                    <tr key={position.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                        {position.strategy_name}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: position.instrument === 'NIFTY' ? 'rgba(0,212,170,0.1)' : 'rgba(255,159,67,0.1)',
                          color: position.instrument === 'NIFTY' ? 'var(--accent)' : 'var(--yellow)',
                        }}>
                          {position.instrument}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)' }}>
                        {new Date(position.entry_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                        ₹{position.entry_premium?.toFixed(2) || '—'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <button
                          onClick={() => {
                            const exitPremium = prompt('Enter exit premium:')
                            if (exitPremium) closePosition(position.id, parseFloat(exitPremium))
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--accent)',
                            background: 'none',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                          }}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>Loading...</div>
            ) : closedPositions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No closed positions</p>
                <p style={{ fontSize: '0.85rem' }}>Your closed paper positions will appear here</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>STRATEGY</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>EXIT DATE</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>ENTRY</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>EXIT</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 600 }}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {closedPositions.map(position => {
                    const pnl = (position.exit_premium || 0) - (position.entry_premium || 0)
                    return (
                      <tr key={position.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                          {position.strategy_name}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)' }}>
                          {position.exit_date ? new Date(position.exit_date).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                          ₹{position.entry_premium?.toFixed(2) || '—'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text2)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                          ₹{position.exit_premium?.toFixed(2) || '—'}
                        </td>
                        <td style={{ 
                          padding: '12px 8px', 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text2)', 
                          textAlign: 'right',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}>
                          {pnl > 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Paper Position Modal */}
      {showPaperModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)',
        }}>
          <div style={{
            width: '400px',
            background: 'var(--surface2)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              Add Paper Position
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text2)' }}>
                Select Strategy
              </label>
              <select
                value={selectedStrategy?.id || ''}
                onChange={(e) => {
                  const strategy = strategies.find(s => s.id === e.target.value)
                  setSelectedStrategy(strategy || null)
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                <option value="">Choose a strategy...</option>
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text2)' }}>
                Entry Premium
              </label>
              <input
                type="number"
                value={entryPremium}
                onChange={(e) => setEntryPremium(e.target.value)}
                placeholder="Enter premium amount"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPaperModal(false)
                  setSelectedStrategy(null)
                  setEntryPremium('')
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createPaperPosition}
                disabled={!selectedStrategy || !entryPremium}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedStrategy && entryPremium ? 'var(--accent)' : 'var(--surface)',
                  color: selectedStrategy && entryPremium ? '#0a0c10' : 'var(--text3)',
                  cursor: selectedStrategy && entryPremium ? 'pointer' : 'default',
                }}
              >
                Add Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
