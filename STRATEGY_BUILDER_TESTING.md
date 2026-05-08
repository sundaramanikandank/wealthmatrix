# Strategy Builder - Real Data Integration Testing

Frontend: **http://localhost:5175**  
Backend: **http://localhost:4000**

## ✅ Implemented Features

### 1. Component Mount - Initial Data Load
**What happens:**
- Automatically calls `/api/market/spot?symbol=NIFTY`
- Automatically calls `/api/market/expiries?symbol=NIFTY`
- Populates spot price display with live NSE data
- Populates expiry dropdown with weekly/monthly expiries
- Auto-selects first available expiry
- Automatically fetches option chain for selected expiry

**Test:**
1. Open http://localhost:5175
2. ✅ Verify NIFTY spot price appears (e.g., ₹24,326.65)
3. ✅ Verify change/% change shows (green if positive, red if negative)
4. ✅ Verify expiry dropdown is populated
5. ✅ Verify loading skeleton appears briefly during fetch

---

### 2. Instrument Change
**What happens:**
- Clears all legs from the strategy
- Clears the payoff chart
- Calls `/api/market/spot?symbol=[NEW_INSTRUMENT]`
- Calls `/api/market/expiries?symbol=[NEW_INSTRUMENT]`
- Resets strike input to nearest 50 (NIFTY) or 100 (BANKNIFTY)
- Fetches option chain for first expiry

**Test:**
1. Click **BANKNIFTY** button
2. ✅ Verify spot price updates to Bank Nifty value
3. ✅ Verify expiry dropdown updates (Wednesday expiries for BANKNIFTY)
4. ✅ Verify any existing legs are cleared
5. ✅ Verify strike input rounds to nearest 100
6. Click **NIFTY** to switch back
7. ✅ Verify strike rounds to nearest 50

---

### 3. Expiry Change
**What happens:**
- Calls `/api/market/option-chain?symbol=NIFTY&expiry=[SELECTED]`
- Stores chain data in Zustand store
- Shows "Loading chain..." indicator
- Auto-fills LTP when user types a strike

**Test:**
1. Select different expiry from dropdown
2. ✅ Verify "Loading chain..." appears in LTP field
3. ✅ Wait for chain to load
4. Type a strike price (e.g., 24300)
5. ✅ Verify LTP auto-fills from chain data
6. ✅ Verify IV auto-fills from chain data

---

### 4. Loading States
**What happens:**
- Spot card shows pulsing skeleton while loading
- Expiry dropdown shows "Loading…" while fetching
- LTP input shows "LTP (₹) …" while chain is loading
- Add Leg button is disabled while LTP is 0 or invalid

**Test:**
1. Refresh page
2. ✅ Verify spot card shows loading skeleton
3. ✅ Verify expiry dropdown shows "Loading…"
4. Change expiry
5. ✅ Verify LTP field shows loading indicator
6. ✅ Verify Add Leg button is disabled until LTP > 0

---

### 5. Error Handling
**What happens:**
- If any API call fails, red error banner appears at top
- Banner shows error message with Retry and × buttons
- Retry button re-fetches spot + expiries
- × button dismisses the banner

**Test:**
1. Stop backend server: `kill $(lsof -ti:4000)`
2. Refresh frontend
3. ✅ Verify red error banner appears with connection error
4. ✅ Click **Retry** button
5. ✅ Verify error persists (backend still down)
6. Restart backend: `cd backend && npm run dev`
7. Click **Retry** again
8. ✅ Verify error banner disappears
9. ✅ Verify data loads successfully

---

### 6. Auto-Refresh
**What happens:**
- Every 30 seconds, automatically refetches `/api/market/spot`
- Updates spot price display
- Updates payoff chart if legs exist
- Does NOT refetch option chain (too slow)

**Test:**
1. Open browser DevTools → Network tab
2. Wait 30 seconds
3. ✅ Verify `/api/market/spot?symbol=NIFTY` request appears
4. ✅ Verify spot price updates (if market is open)
5. ✅ Verify no `/api/market/option-chain` requests (only on expiry change)

---

### 7. Auto-Fill LTP from Chain
**What happens:**
- When user types a strike, checks if it exists in chain data
- Auto-fills LTP from `chain[strike].ce.lastPrice` or `.pe.lastPrice`
- Auto-fills IV from `chain[strike].ce.impliedVolatility` or `.pe.impliedVolatility`
- If strike not in chain, LTP stays 0

**Test:**
1. Ensure expiry is selected and chain is loaded
2. Select **CE** option type
3. Type strike: **24300**
4. ✅ Verify LTP auto-fills (e.g., 125.50)
5. Change to **PE**
6. ✅ Verify LTP updates to PE premium (e.g., 98.30)
7. Type invalid strike: **99999**
8. ✅ Verify LTP stays 0 or shows last valid value

---

### 8. Add Leg with Real Data
**What happens:**
- Validates LTP > 0
- Adds leg to store with real LTP and IV from chain
- Immediately recalculates payoff, Greeks, summary metrics
- Renders payoff chart with real premium values

**Test:**
1. Select expiry, type strike (e.g., 24300 CE)
2. ✅ Verify LTP auto-fills
3. Click **+ Add Leg**
4. ✅ Verify leg appears in legs list with real LTP
5. ✅ Verify payoff chart renders
6. ✅ Verify Greeks panel shows calculated values
7. ✅ Verify Summary bar shows Max Profit, Max Loss, Breakeven

---

### 9. Preset Strategies with Real Data
**What happens:**
- Calculates ATM strike from current spot price
- Uses chain data to get real LTP for each leg
- Clears existing legs and adds preset legs
- Immediately renders chart with real premiums

**Test:**
1. Ensure spot and chain are loaded
2. Click **Strategies** tab
3. Click **Straddle**
4. ✅ Verify 2 legs added (ATM CE + ATM PE)
5. ✅ Verify both legs have real LTP from chain
6. ✅ Verify payoff chart shows accurate straddle shape
7. Try **Iron Condor**
8. ✅ Verify 4 legs with correct strikes and real premiums

---

## Data Flow Summary

```
Component Mount
    ↓
fetchSpotAndExpiries(NIFTY)
    ↓
GET /api/market/spot?symbol=NIFTY
GET /api/market/expiries?symbol=NIFTY
    ↓
Store updates: spotData, expiriesData
    ↓
Auto-select first expiry
    ↓
fetchChain(NIFTY, firstExpiry)
    ↓
GET /api/market/option-chain?symbol=NIFTY&expiry=2026-05-14
    ↓
Store updates: chainData
    ↓
User types strike → auto-fill LTP from chainData
    ↓
User clicks Add Leg → leg added with real LTP/IV
    ↓
Payoff/Greeks/Summary recalculated
```

---

## Auto-Refresh Flow

```
Every 30 seconds:
    ↓
fetchSpotAndExpiries(currentInstrument)
    ↓
GET /api/market/spot?symbol=NIFTY
GET /api/market/expiries?symbol=NIFTY
    ↓
spotData updates → chart re-renders if legs exist
```

---

## Error Scenarios

| Scenario | Expected Behavior |
|---|---|
| Backend down on mount | Red error banner, "Retry" button |
| NSE API timeout | Stale cached data returned with `stale: true` flag |
| Invalid expiry format | 400 error, banner shows "expiry query param required" |
| Invalid symbol | 400 error, banner shows "symbol must be NIFTY or BANKNIFTY" |
| Network error mid-session | Error banner appears, auto-refresh continues trying |

---

## Performance Notes

- **Spot refresh**: 30s interval, ~200ms response time
- **Option chain**: Only fetched on expiry change, ~2-3s response time
- **Chain caching**: 60s TTL on backend, stale fallback on error
- **Auto-fill**: Instant (reads from local store, no API call)

---

## Known Limitations

1. **Mock data**: OI history and IV history endpoints return randomized mock data
2. **Expiries filtering**: May return empty arrays if NSE date format parsing fails
3. **Auth disabled**: Supabase not configured, save functionality may not persist
4. **Market hours**: Spot prices only update during market hours (9:15 AM - 3:30 PM IST)

---

## Next Steps

- [ ] Implement real OI history from NSE historical data
- [ ] Implement real IV history calculation
- [ ] Add WebSocket for real-time spot updates
- [ ] Add chain refresh button (manual)
- [ ] Show "stale data" indicator when `stale: true`
