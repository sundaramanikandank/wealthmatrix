import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import StrategyBuilder from './pages/StrategyBuilder'
import OptionChain from './pages/OptionChain'
import OICharts from './pages/OICharts'
import IVCharts from './pages/IVCharts'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
          success: {
            iconTheme: {
              primary: 'var(--green)',
              secondary: 'var(--surface2)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--red)',
              secondary: 'var(--surface2)',
            },
          },
        }}
      />
      <Navbar />
      <main style={{ paddingTop: '56px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/strategy-builder" replace />} />
          <Route path="/strategy-builder" element={<StrategyBuilder />} />
          <Route path="/option-chain" element={<OptionChain />} />
          <Route path="/oi-charts" element={<OICharts />} />
          <Route path="/iv-charts" element={<IVCharts />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portfolio" element={<Portfolio />} />
          </Route>
        </Routes>
      </main>
    </ErrorBoundary>
  )
}

export default App
