import { Router, Request, Response } from 'express'
import { getSpotPrice, getExpiries, getOptionChain, IndexSymbol } from '../services/nse'

const router = Router()

const VALID_SYMBOLS: IndexSymbol[] = ['NIFTY', 'BANKNIFTY']

function resolveSymbol(req: Request, res: Response): IndexSymbol | null {
  const sym = (req.query.symbol as string | undefined)?.toUpperCase()
  if (!sym || !VALID_SYMBOLS.includes(sym as IndexSymbol)) {
    res.status(400).json({ error: `symbol query param must be one of: ${VALID_SYMBOLS.join(', ')}` })
    return null
  }
  return sym as IndexSymbol
}

// 1. GET /api/market/instruments
router.get('/instruments', (_req, res) => {
  res.json({
    data: [
      { symbol: 'NIFTY', name: 'Nifty 50', lotSize: 75, type: 'INDEX' },
      { symbol: 'BANKNIFTY', name: 'Bank Nifty', lotSize: 15, type: 'INDEX' },
    ],
  })
})

// 2. GET /api/market/spot?symbol=NIFTY
router.get('/spot', async (req: Request, res: Response) => {
  const symbol = resolveSymbol(req, res)
  if (!symbol) return
  try {
    const data = await getSpotPrice(symbol)
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch spot price'
    res.status(500).json({ error: message })
  }
})

// 3. GET /api/market/expiries?symbol=NIFTY
router.get('/expiries', async (req: Request, res: Response) => {
  const symbol = resolveSymbol(req, res)
  if (!symbol) return
  try {
    const data = await getExpiries(symbol)
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch expiries'
    res.status(500).json({ error: message })
  }
})

// 4. GET /api/market/option-chain?symbol=NIFTY&expiry=2025-05-08
router.get('/option-chain', async (req: Request, res: Response) => {
  const symbol = resolveSymbol(req, res)
  if (!symbol) return

  const expiry = req.query.expiry as string | undefined
  if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    res.status(400).json({ error: 'expiry query param required in YYYY-MM-DD format' })
    return
  }

  try {
    const data = await getOptionChain(symbol, expiry)
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch option chain'
    res.status(500).json({ error: message })
  }
})

// 5. GET /api/market/oi-history?symbol=NIFTY&expiry=2025-05-08
router.get('/oi-history', (req: Request, res: Response) => {
  const symbol = resolveSymbol(req, res)
  if (!symbol) return

  const expiry = req.query.expiry as string | undefined
  if (!expiry) {
    res.status(400).json({ error: 'expiry query param required' })
    return
  }

  // Mock data: 20 data points over last 4 hours
  const now = Date.now()
  const interval = (4 * 60 * 60 * 1000) / 20 // 12 minutes
  const data = Array.from({ length: 20 }, (_, i) => {
    const timestamp = new Date(now - (19 - i) * interval).toISOString()
    const ceOI = 5_000_000 + Math.floor(Math.random() * 1_000_000)
    const peOI = 6_000_000 + Math.floor(Math.random() * 1_000_000)
    const pcr = parseFloat((peOI / ceOI).toFixed(4))
    return { timestamp, ceOI, peOI, pcr }
  })

  res.json({ data })
})

// 6. GET /api/market/iv-history?symbol=NIFTY&expiry=2025-05-08
router.get('/iv-history', (req: Request, res: Response) => {
  const symbol = resolveSymbol(req, res)
  if (!symbol) return

  const expiry = req.query.expiry as string | undefined
  if (!expiry) {
    res.status(400).json({ error: 'expiry query param required' })
    return
  }

  // Mock data: 20 data points over last 4 hours
  const now = Date.now()
  const interval = (4 * 60 * 60 * 1000) / 20 // 12 minutes
  const data = Array.from({ length: 20 }, (_, i) => {
    const timestamp = new Date(now - (19 - i) * interval).toISOString()
    const ceIV = 12 + Math.random() * 3
    const peIV = 13 + Math.random() * 3
    const atmIV = (ceIV + peIV) / 2
    return {
      timestamp,
      ceIV: parseFloat(ceIV.toFixed(2)),
      peIV: parseFloat(peIV.toFixed(2)),
      atmIV: parseFloat(atmIV.toFixed(2)),
    }
  })

  res.json({ data })
})

export default router
