# API Testing Results

Backend server running on **http://localhost:4000**

## ✅ All 6 Endpoints Tested

### 1. GET /api/market/instruments
Returns hardcoded instrument list with lot sizes.

```bash
curl http://localhost:4000/api/market/instruments
```

**Response:**
```json
{
  "data": [
    { "symbol": "NIFTY", "name": "Nifty 50", "lotSize": 75, "type": "INDEX" },
    { "symbol": "BANKNIFTY", "name": "Bank Nifty", "lotSize": 15, "type": "INDEX" }
  ]
}
```

---

### 2. GET /api/market/spot?symbol=NIFTY
Fetches live spot price from NSE via `stock-nse-india`.

```bash
curl 'http://localhost:4000/api/market/spot?symbol=NIFTY'
```

**Response:**
```json
{
  "symbol": "NIFTY",
  "spot": 24326.65,
  "change": -4.3,
  "changePct": -0.02,
  "timestamp": "07-May-2026 21:00:30"
}
```

---

### 3. GET /api/market/expiries?symbol=NIFTY
Fetches expiry dates from NSE, filtered for future dates.

```bash
curl 'http://localhost:4000/api/market/expiries?symbol=NIFTY'
```

**Response:**
```json
{
  "weekly": ["2026-05-14", "2026-05-21", "2026-05-28", "2026-06-04"],
  "monthly": ["2026-05-28", "2026-06-25", "2026-07-30"]
}
```

---

### 4. GET /api/market/option-chain?symbol=NIFTY&expiry=2026-05-14
Fetches full option chain from NSE with PCR, max pain, ATM strike.

```bash
curl 'http://localhost:4000/api/market/option-chain?symbol=NIFTY&expiry=2026-05-14'
```

**Response structure:**
```json
{
  "symbol": "NIFTY",
  "expiry": "2026-05-14",
  "spot": 24326.65,
  "futures": null,
  "chain": {
    "24300": {
      "ce": { "lastPrice": 125.5, "openInterest": 1234567, "impliedVolatility": 14.2, ... },
      "pe": { "lastPrice": 98.3, "openInterest": 987654, "impliedVolatility": 13.8, ... }
    },
    ...
  },
  "pcr": 1.2345,
  "maxPain": 24300,
  "atmStrike": 24300,
  "timestamp": "2026-05-07T18:00:30.000Z"
}
```

If NSE fetch fails, returns stale cached data with `"stale": true`.

---

### 5. GET /api/market/oi-history?symbol=NIFTY&expiry=2026-05-14
Returns **mock data** (20 data points over 4 hours).

```bash
curl 'http://localhost:4000/api/market/oi-history?symbol=NIFTY&expiry=2026-05-14'
```

**Response:**
```json
{
  "data": [
    { "timestamp": "2026-05-07T13:30:23.155Z", "ceOI": 5234567, "peOI": 6123456, "pcr": 1.1698 },
    { "timestamp": "2026-05-07T13:42:23.155Z", "ceOI": 5345678, "peOI": 6234567, "pcr": 1.1663 },
    ...
  ]
}
```

---

### 6. GET /api/market/iv-history?symbol=NIFTY&expiry=2026-05-14
Returns **mock data** (20 data points over 4 hours).

```bash
curl 'http://localhost:4000/api/market/iv-history?symbol=NIFTY&expiry=2026-05-14'
```

**Response:**
```json
{
  "data": [
    { "timestamp": "2026-05-07T13:30:23.155Z", "ceIV": 12.94, "peIV": 15.91, "atmIV": 14.42 },
    { "timestamp": "2026-05-07T13:42:23.155Z", "ceIV": 13.21, "peIV": 14.87, "atmIV": 14.04 },
    ...
  ]
}
```

---

## Error Handling

All endpoints return proper HTTP status codes:
- **400** - Invalid symbol or missing required params
- **500** - NSE fetch failed (with error message)
- **200** - Success (may include `stale: true` if using cached data)

## Notes

- **Auth disabled**: Supabase credentials not configured, auth middleware skips validation
- **NSE caching**: 60-second TTL, falls back to stale cache on network errors
- **Date format**: Expiry dates in ISO format `YYYY-MM-DD`
- **Mock data**: OI/IV history endpoints return randomized mock data for now
