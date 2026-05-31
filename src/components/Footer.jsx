import { useTheme } from '../context/ThemeContext'

export default function Footer({ minimal = false }) {
  const { isDark } = useTheme()
  const year = new Date().getFullYear()

  if (minimal) {
    return (
      <p style={{
        textAlign: 'center',
        fontSize: '11px',
        color: isDark ? '#334155' : '#94a3b8',
        padding: '10px 0 4px',
        margin: 0,
      }}>
        © {year} Orbit. All rights reserved.
      </p>
    )
  }

  return (
    <footer style={{
      borderTop: `1px solid ${isDark
        ? 'rgba(255,255,255,0.05)' : '#f0eeff'}`,
      padding: '10px 20px',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '8px',
    }}>
      <span style={{
        fontSize: '11px',
        color: isDark ? '#334155' : '#94a3b8',
      }}>
        © {year}{' '}
        <span style={{
          fontWeight: 700,
          color: isDark ? '#475569' : '#64748b',
        }}>
          Orbit
        </span>
        . All rights reserved.
      </span>

      <div style={{
        display: 'flex',
        gap: '14px',
      }}>
        {[
          { l: 'Privacy', h: '/privacy' },
          { l: 'Terms', h: '/terms' },
          { l: 'Support', h: 'mailto:iamahmad3027@gmail.com' },
        ].map(link => (
          <a
            key={link.l}
            href={link.h}
            style={{
              fontSize: '11px',
              color: isDark ? '#334155' : '#94a3b8',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.target.style.color = '#6366f1'
            }}
            onMouseLeave={e => {
              e.target.style.color = isDark
                ? '#334155' : '#94a3b8'
            }}>
            {link.l}
          </a>
        ))}
      </div>
    </footer>
  )
}
