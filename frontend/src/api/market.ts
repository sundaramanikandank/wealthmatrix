import type { SpotData, ExpiriesData, ChainData } from '../store/strategyStore'
import { fetchWithRetry } from '../utils/api'

const API = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000'

async function apiFetch<T>(path: string, showToast = false): Promise<T> {
  const res = await fetchWithRetry(`${API}${path}`, { 
    retryCount: 1,
    showToast,
  })
  const json = await res.json()
  return (json.data ?? json) as T
}

export async function fetchSpot(symbol: string): Promise<SpotData> {
  return apiFetch<SpotData>(`/api/market/spot?symbol=${symbol}`, true)
}

export async function fetchExpiries(symbol: string): Promise<ExpiriesData> {
  return apiFetch<ExpiriesData>(`/api/market/expiries?symbol=${symbol}`, true)
}

export async function fetchOptionChain(symbol: string, expiry: string): Promise<ChainData> {
  return apiFetch<ChainData>(
    `/api/market/option-chain?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`,
    true
  )
}

export async function saveStrategy(
  payload: Record<string, unknown>,
  accessToken: string,
): Promise<void> {
  const res = await fetchWithRetry(`${API}/api/portfolio/strategies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    retryCount: 1,
    showToast: true,
  })
  await res.json()
}
