import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_LINKS = [
  { to: '/strategy-builder', label: 'Strategy Builder' },
  { to: '/option-chain', label: 'Option Chain' },
  { to: '/oi-charts', label: 'OI Charts' },
  { to: '/iv-charts', label: 'IV Charts' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/portfolio', label: 'Portfolio', authRequired: true },
]

function getISTTime(): Date {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return ist
}

function isMarketOpen(ist: Date): boolean {
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  const h = ist.getHours()
  const m = ist.getMinutes()
  const total = h * 60 + m
  return total >= 9 * 60 + 15 && total < 15 * 60 + 30
}

function formatTime(ist: Date): string {
  return ist.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function Navbar() {
  const [time, setTime] = useState<Date>(getISTTime())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()

  useEffect(() => {
    const id = setInterval(() => setTime(getISTTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const open = isMarketOpen(time)

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0 1rem',
          height: '56px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="mono"
          style={{
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '1.2rem',
            letterSpacing: '0.04em',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          StratOS
        </Link>

        {/* Desktop Nav links */}
        <ul
          style={{
            display: 'flex',
            listStyle: 'none',
            gap: '0.5rem',
            margin: 0,
            padding: 0,
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
          className="desktop-nav"
        >
          {NAV_LINKS.filter(link => !link.authRequired || user).map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  background: isActive ? 'rgba(0,212,170,0.08)' : 'transparent',
                  transition: 'color 0.15s, background 0.15s',
                })}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn"
          style={{
            display: 'none',
            padding: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            lineHeight: 1,
          }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '×' : '☰'}
        </button>

      {/* Right side: auth + market status + clock */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        {/* Auth section */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
              {user.email}
            </span>
            <button
              onClick={logout}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text2)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface2)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)'
                e.currentTarget.style.color = 'var(--text2)'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#0a0c10',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            Login
          </Link>
        )}

        {/* Market status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: open ? 'var(--green)' : 'var(--red)',
              boxShadow: open ? '0 0 6px var(--green)' : '0 0 6px var(--red)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              color: open ? 'var(--green)' : 'var(--red)',
              fontWeight: 600,
            }}
          >
            {open ? 'Market Open' : 'Market Closed'}
          </span>
        </div>

        {/* IST clock */}
        <span
          className="mono mobile-hide"
          style={{
            fontSize: '0.8rem',
            color: 'var(--text2)',
            letterSpacing: '0.05em',
          }}
        >
          {formatTime(time)} IST
        </span>
      </div>
    </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            zIndex: 99,
            background: 'var(--surface2)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: '8px' }}>
            {NAV_LINKS.filter(link => !link.authRequired || user).map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive ? 'var(--accent)' : 'var(--text)',
                    background: isActive ? 'rgba(0,212,170,0.08)' : 'transparent',
                  })}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile menu styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .mobile-hide {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
