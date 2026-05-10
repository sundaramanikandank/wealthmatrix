import { useEffect, useState, useRef } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_LINKS = [
  { to: '/strategy-builder', label: 'Strategy Builder' },
  { to: '/option-chain', label: 'Option Chain' },
  { to: '/oi-charts', label: 'OI Charts' },
  { to: '/iv-charts', label: 'IV Charts' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/portfolio', label: 'Portfolio', authRequired: true },
]

const WEALTH_LINKS = [
  { to: '/wealth', label: 'Wealth Overview' },
  { to: '/wealth/snapshots', label: 'Wealth Grid' },
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
  const [wealthDropdownOpen, setWealthDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const wealthButtonRef = useRef<HTMLButtonElement>(null)
  const { user, logout } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    const id = setInterval(() => setTime(getISTTime()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wealthDropdownOpen && wealthButtonRef.current && !wealthButtonRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('[data-wealth-dropdown]')
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setWealthDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [wealthDropdownOpen])

  const open = isMarketOpen(time)
  const isWealthActive = location.pathname.startsWith('/wealth')

  const handleWealthClick = () => {
    if (!wealthDropdownOpen && wealthButtonRef.current) {
      const rect = wealthButtonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
    setWealthDropdownOpen(!wealthDropdownOpen)
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .desktop-auth-section {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
        .wealth-dropdown-link:hover {
          background: rgba(0,212,170,0.12) !important;
          color: var(--accent) !important;
        }
      `}</style>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          Wealth Matrix
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
            overflowY: 'visible',
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
          
          {/* Wealth Dropdown */}
          {user && (
            <li style={{ position: 'static' }}>
              <button
                ref={wealthButtonRef}
                onClick={handleWealthClick}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  color: isWealthActive ? 'var(--accent)' : 'var(--text2)',
                  background: isWealthActive ? 'rgba(0,212,170,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Wealth ▾
              </button>
              
              {wealthDropdownOpen && (
                <ul
                  data-wealth-dropdown
                  style={{
                    position: 'fixed',
                    top: `${dropdownPos.top}px`,
                    left: `${dropdownPos.left}px`,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    listStyle: 'none',
                    padding: '8px',
                    minWidth: '180px',
                    zIndex: 99999,
                  }}
                >
                  {WEALTH_LINKS.map(({ to, label }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={() => setWealthDropdownOpen(false)}
                        className="wealth-dropdown-link"
                        style={{
                          display: 'block',
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          textDecoration: 'none',
                          color: 'var(--text2)',
                          background: 'transparent',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn"
          style={{
            display: 'none',
            padding: 0,
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '2rem',
            lineHeight: 1,
            width: '48px',
            height: '48px',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '×' : '☰'}
        </button>

      {/* Right side: auth + market status + clock */}
      <div
        className="desktop-auth-section"
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
        <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  })}
                >
                  {label}
                </NavLink>
              </li>
            ))}
            {/* Wealth section divider */}
            <li style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
              <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                WEALTH
              </div>
            </li>
            {WEALTH_LINKS.map(({ to, label }) => (
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
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  })}
                >
                  {label}
                </NavLink>
              </li>
            ))}
            {/* Auth in mobile menu */}
            <li style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px' }}>
              {user ? (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--red)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  Logout ({user.email})
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: 'var(--accent)',
                    background: 'rgba(0,212,170,0.08)',
                  }}
                >
                  Login
                </Link>
              )}
            </li>
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
            display: flex !important;
          }
          .mobile-hide {
            display: none !important;
          }
          .desktop-auth-section {
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
