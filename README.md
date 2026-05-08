# Options Strategy Builder

A comprehensive web application for analyzing and visualizing options trading strategies for NIFTY and BANKNIFTY.

![Options Strategy Builder](https://img.shields.io/badge/React-18.3-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Express](https://img.shields.io/badge/Express-4.21-lightgrey)

---

## 🚀 Features

### Strategy Builder
- **Multi-leg Options**: Create complex strategies with unlimited legs
- **Real-time Payoff Chart**: Visualize P&L at expiration
- **Greeks Analysis**: View Delta, Gamma, Theta, Vega for entire position
- **Live Market Data**: Real-time spot prices and option chain
- **Save & Load**: Save strategies to portfolio for later analysis

### Market Data
- **Option Chain**: Complete option chain with OI, IV, and Greeks
- **OI Charts**: Open Interest analysis with Put-Call Ratio
- **IV Charts**: Implied Volatility trends and IV Percentile
- **Market Screener**: Dashboard with key metrics for NIFTY & BANKNIFTY

### Portfolio Management
- **Saved Strategies**: Store and manage your strategy ideas
- **Paper Trading**: Simulate trades and track P&L
- **Trade History**: View all past paper positions
- **Authentication**: Secure user accounts with Supabase Auth

### User Experience
- **Dark Theme**: Eye-friendly dark mode interface
- **Mobile Responsive**: Works on all devices (375px+)
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Loading States**: Skeleton loaders and spinners
- **Toast Notifications**: Real-time feedback for all actions

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast builds
- **Zustand** for state management
- **React Router** for navigation
- **Recharts** for data visualization
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **CORS** configured for production

### Deployment
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)
- **Database**: Supabase (free tier)
- **Monitoring**: UptimeRobot (free tier)

---

## 📦 Project Structure

```
options-strategy-builder/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── utils/           # Utility functions
│   │   ├── api/             # API client
│   │   └── styles/          # CSS files
│   ├── public/              # Static assets
│   └── package.json
│
├── backend/                  # Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   └── index.ts         # Server entry point
│   └── package.json
│
├── DEPLOYMENT_GUIDE.md       # Full deployment guide
├── QUICK_DEPLOY.md           # Quick start guide
└── README.md                 # This file
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/options-strategy-builder.git
cd options-strategy-builder
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Backend runs on `http://localhost:4000`

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL and Supabase credentials
npm run dev
```

Frontend runs on `http://localhost:5173`

### 4. Setup Supabase

Run the SQL in `DEPLOYMENT_GUIDE.md` to create tables and RLS policies.

---

## 🌐 Deployment

### Quick Deploy (15 minutes)

See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for fast-track deployment.

### Full Guide

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive deployment instructions.

### Deployment Summary

1. **Backend (Render)**:
   - Build: `npm install && npm run build`
   - Start: `node dist/index.js`
   - Environment variables: Supabase keys, CORS origins

2. **Frontend (Vercel)**:
   - Build: `npm run build`
   - Output: `dist/`
   - Environment variables: Backend URL, Supabase keys

3. **Keep-Alive (UptimeRobot)**:
   - Ping `/api/health` every 5 minutes
   - Prevents Render free tier spin-down

---

## 📱 Mobile Support

Fully responsive design tested on:
- iPhone SE (375px)
- iPhone 12/13 (390px)
- iPad Mini (768px)
- Desktop (1024px+)

Features:
- Hamburger menu navigation
- Touch-friendly buttons (48px+)
- Horizontal scrolling tables
- Responsive charts
- No iOS zoom on inputs

See [MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md) for testing checklist.

---

## 🔐 Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)
```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 🧪 Testing

### Run Tests
```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
npm test
```

### Manual Testing
1. Register new account
2. Login
3. Build strategy with multiple legs
4. Save strategy
5. View in portfolio
6. Create paper position
7. Test all pages

---

## 📊 API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/market/spot?symbol=NIFTY` - Spot price
- `GET /api/market/expiries?symbol=NIFTY` - Expiry dates
- `GET /api/market/option-chain?symbol=NIFTY&expiry=2024-01-25` - Option chain

### Protected Endpoints (Requires Auth)
- `GET /api/portfolio/strategies` - Get saved strategies
- `POST /api/portfolio/strategies` - Save strategy
- `DELETE /api/portfolio/strategies/:id` - Delete strategy
- `GET /api/portfolio/paper-positions` - Get paper positions
- `POST /api/portfolio/paper-positions` - Create paper position
- `PUT /api/portfolio/paper-positions/:id` - Update paper position

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/options-strategy-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/options-strategy-builder/discussions)
- **Email**: your.email@example.com

---

## 🙏 Acknowledgments

- Market data powered by NSE India
- Authentication by Supabase
- Charts by Recharts
- Icons by Lucide React

---

## 📈 Roadmap

- [ ] Real-time market data streaming
- [ ] Advanced strategy templates
- [ ] Backtesting engine
- [ ] Options Greeks calculator
- [ ] Multi-user collaboration
- [ ] Mobile app (React Native)
- [ ] Advanced charting (TradingView)
- [ ] Risk management tools

---

## 🎯 Status

- ✅ Strategy Builder
- ✅ Market Data Integration
- ✅ Portfolio Management
- ✅ Paper Trading
- ✅ Authentication
- ✅ Mobile Responsive
- ✅ Error Handling
- ✅ Production Ready

---

**Built with ❤️ for options traders**
