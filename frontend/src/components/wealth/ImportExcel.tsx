import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { authFetch } from '../../lib/authFetch'
import type { GridColumn } from './WealthGrid'

const API = import.meta.env.VITE_API_BASE_URL

interface Props {
  columns: GridColumn[]
  onClose: () => void
  onImported: () => void
}

type Step = 1 | 2 | 3

interface ParsedRow { [key: string]: string | number }

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function parseMonth(raw: string | number): string | null {
  const s = String(raw).trim()
  if (!isNaN(Number(s)) && Number(s) > 1000) {
    const date = XLSX.SSF.parse_date_code(Number(s))
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 7)
  const parts = s.split(/[\s\-/]/)
  if (parts.length >= 2) {
    const mStr = parts[0].toLowerCase().substring(0, 3)
    const yStr = parts.find((p) => p.length === 4 && !isNaN(Number(p)))
    if (MONTH_MAP[mStr] && yStr) return `${yStr}-${MONTH_MAP[mStr]}`
  }
  return null
}

function downloadTemplate(columns: GridColumn[]) {
  const headers = ['Month', ...columns.map((c) => c.label)]
  const example = ['Jan 2024', ...columns.map(() => '0')]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Wealth Grid')
  XLSX.writeFile(wb, 'wealth_grid_template.csv')
}

export default function ImportExcel({ columns, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [allData, setAllData] = useState<ParsedRow[]>([])
  const [monthCol, setMonthCol] = useState('')
  const [colMap, setColMap] = useState<Record<string, string>>({}) // header → colId or '__new__' or '__skip__'
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!json.length) return

      const allHdrs = Object.keys(json[0])
      // Drop headers where every row has no meaningful value
      const hdrs = allHdrs.filter((h) =>
        json.some((r) => r[h] !== '' && r[h] !== null && r[h] !== undefined && Number(r[h]) !== 0)
      )
      setHeaders(hdrs)
      setAllData(json)
      setPreview(json.slice(0, 5))

      // Auto-detect the month/date column
      const MONTH_RE = /date|month|period|mon\b/i
      const SKIP_RE = /net.?worth|total|profit|loss|p&l|%|return|gain|balance/i
      const detectedMonth = hdrs.find((h) => MONTH_RE.test(h)) || hdrs[0]
      setMonthCol(detectedMonth)

      // Build mapping — prevent duplicate column ID assignments
      const map: Record<string, string> = {}
      const usedIds = new Set<string>()
      hdrs.forEach((h) => {
        if (SKIP_RE.test(h)) { map[h] = '__skip__'; return }
        const match = columns.find((c) => c.label.toLowerCase() === h.toLowerCase() && !usedIds.has(c.id))
        if (match) { map[h] = match.id; usedIds.add(match.id) }
        else { map[h] = '__new__' }
      })
      setColMap(map)
      setStep(2)
    }
    reader.readAsArrayBuffer(file)
  }

  const mappedMonths = allData
    .map((r) => (r[monthCol] ? parseMonth(r[monthCol]) : null))
    .filter(Boolean) as string[]

  const handleImport = async () => {
    // First create any '__new__' columns
    const newColIds: Record<string, string> = {}
    for (const [header, val] of Object.entries(colMap)) {
      if (val === '__new__') {
        try {
          const res = await authFetch(`${API}/api/wealth/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: header, color: '#6366f1' }),
          })
          if (res.ok) {
            const col = await res.json()
            newColIds[header] = col.id
          }
        } catch (err) { console.error(err) }
      }
    }

    setProgress(0)
    let count = 0
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i]
      const month = parseMonth(row[monthCol])
      if (!month) continue

      const values: Record<string, number> = {}
      for (const [hdr, mapVal] of Object.entries(colMap)) {
        if (mapVal === '__skip__') continue
        const colId = mapVal === '__new__' ? newColIds[hdr] : mapVal
        if (colId) values[colId] = parseFloat(String(row[hdr])) || 0
      }

      try {
        await authFetch(`${API}/api/wealth/grid/row`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, values }),
        })
      } catch (err) { console.error(err) }

      count++
      setProgress(count)
    }

    setDone(true)
    setStep(3)
    onImported()
  }

  const mappedCount = Object.values(colMap).filter((v) => v !== '__skip__').length

  const selectStyle: React.CSSProperties = { padding: '6px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.78rem', width: '100%' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Import Excel / CSV</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '2px' }}>Step {step} of 3</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <>
              {/* Format hint */}
              <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>Expected format:</strong><br />
                Row 1: <code>Month, Savings, MF India, Stocks, ...</code><br />
                Row 2+: <code>Jan 2024, 500000, 200000, ...</code><br />
                <span style={{ color: 'var(--text3)' }}>Values should be plain numbers (no ₹, no commas).</span>
              </div>

              {columns.length > 0 && (
                <button
                  onClick={() => downloadTemplate(columns)}
                  style={{ padding: '9px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                >
                  📥 Download Template CSV (with your columns)
                </button>
              )}

              {/* Drop zone */}
              <div
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface2)' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>Drop your file here</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>or click to browse — .xlsx, .xls, .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </>
          )}

          {/* ── Step 2: Preview + column mapping ── */}
          {step === 2 && (
            <>
              <div style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
                File: <strong style={{ color: 'var(--text)' }}>{fileName}</strong>
                {mappedMonths.length > 0 && <span style={{ color: '#34d399', marginLeft: '10px' }}>✓ {mappedMonths.length} months detected</span>}
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                      {headers.map((h) => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {headers.map((h) => <td key={h} style={{ padding: '5px 10px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{String(row[h])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Month column */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>Month column</label>
                <select value={monthCol} onChange={(e) => setMonthCol(e.target.value)} style={{ ...selectStyle, width: '220px' }}>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Column mapping */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text2)', marginBottom: '8px' }}>
                  Map detected columns → your wealth columns
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {headers.filter((h) => h !== monthCol).map((h) => {
                    const usedElsewhere = new Set(
                      Object.entries(colMap)
                        .filter(([k, v]) => k !== h && v !== '__new__' && v !== '__skip__')
                        .map(([, v]) => v)
                    )
                    return (
                      <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ minWidth: '130px', fontSize: '0.8rem', padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                        <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>→</span>
                        <select value={colMap[h] || '__new__'} onChange={(e) => setColMap({ ...colMap, [h]: e.target.value })} style={selectStyle}>
                          <option value="__new__">+ Create new column "{h}"</option>
                          {columns.filter((c) => !usedElsewhere.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                          <option value="__skip__">Skip (ignore this column)</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={handleImport}
                  disabled={mappedMonths.length === 0 || mappedCount === 0}
                  style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#0a0c10', fontWeight: 700, cursor: 'pointer', opacity: mappedMonths.length === 0 ? 0.5 : 1 }}
                >
                  Import {mappedMonths.length} Months →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Progress / Done ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
              {!done ? (
                <>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>Importing {progress} months...</div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '4px', width: `${(progress / mappedMonths.length) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem' }}>✅</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Imported {progress} months!</div>
                  <button onClick={onClose} style={{ padding: '10px 32px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#0a0c10', fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
