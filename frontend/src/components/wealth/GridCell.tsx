import { useState, useRef, useEffect } from 'react'

interface Props {
  value: number | null
  isEditable: boolean
  isTotal?: boolean
  isReference?: boolean
  isAutoCalc?: boolean
  isManualOverride?: boolean
  onSave: (value: number) => void
  onTab?: () => void
  onShiftTab?: () => void
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const formatRaw = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 4 })

export default function GridCell({
  value,
  isEditable,
  isTotal = false,
  isReference = false,
  isAutoCalc = false,
  isManualOverride = false,
  onSave,
  onTab,
  onShiftTab,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = () => {
    if (!isEditable || isTotal) return
    setInputVal(value != null ? String(value) : '')
    setEditing(true)
  }

  const commitEdit = () => {
    const num = parseFloat(inputVal.replace(/,/g, ''))
    onSave(isNaN(num) ? 0 : num)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setInputVal('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      if (e.shiftKey) {
        onShiftTab?.()
      } else {
        onTab?.()
      }
    }
  }

  const cellStyle: React.CSSProperties = {
    padding: '8px 10px',
    textAlign: 'right',
    fontSize: '0.78rem',
    fontFamily: 'JetBrains Mono, monospace',
    position: 'relative',
    cursor: isEditable && !isTotal ? 'pointer' : 'default',
    opacity: isReference ? 0.75 : 1,
    background: isTotal
      ? 'var(--surface)'
      : editing
      ? 'rgba(99,102,241,0.1)'
      : 'transparent',
    color: isTotal
      ? 'var(--accent)'
      : isReference
      ? '#ffc848'
      : value == null
      ? 'var(--text3)'
      : 'var(--text)',
    fontWeight: isTotal ? 700 : 400,
    fontStyle: isReference ? 'italic' : 'normal',
    borderLeft: isTotal ? '1px solid rgba(0,212,170,0.2)' : undefined,
    minWidth: isTotal ? '110px' : '100px',
    whiteSpace: 'nowrap',
    transition: 'background 0.1s',
    ...(isTotal ? { position: 'sticky', right: 0, zIndex: 1 } : {}),
  }

  if (editing) {
    return (
      <td style={{ ...cellStyle, padding: '2px 4px' }}>
        <input
          ref={inputRef}
          type="number"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: '1px solid var(--accent)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '0.78rem',
            fontFamily: 'JetBrains Mono, monospace',
            padding: '6px 8px',
            textAlign: 'right',
            outline: 'none',
          }}
        />
      </td>
    )
  }

  return (
    <td style={cellStyle} onClick={startEdit}>
      {value != null
        ? isReference ? formatRaw(value) : formatINR(value)
        : <span style={{ color: 'var(--text3)' }}>—</span>}
      {/* Auto-calc indicator */}
      {isAutoCalc && !isManualOverride && (
        <span
          style={{
            position: 'absolute',
            bottom: '3px',
            right: '3px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#00d4aa',
            display: 'block',
          }}
          title="Auto-calculated"
        />
      )}
      {/* Manual override indicator */}
      {isManualOverride && (
        <span
          style={{
            position: 'absolute',
            bottom: '3px',
            right: '3px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#ffc848',
            display: 'block',
          }}
          title="Manually entered"
        />
      )}
    </td>
  )
}
