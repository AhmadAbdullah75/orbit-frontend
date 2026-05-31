import { useTheme } from '../context/ThemeContext'

export default function Footer({ minimal = false }) {
  const { isDark } = useTheme()
  const year = new Date().getFullYear()

  if (minimal) {
    return (
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: isDark ? '#334155' : '#94a3b8',
        padding: '16px',
        margin: 0,
      }}>
        © {year} Orbit. All rights reserved.
      </p>
    )
  }

  return (
    <footer style={{
      borderTop: `1px solid ${isDark
        ? 'rgba(255,255,255,0.06)' : '#e8e6ff'}`,
      padding: '20px 24px',
      marginTop: 'auto',
      background: isDark ? '#0a0a0a' : '#fafaff',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            background:
              'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Orbit
          </span>
          <span style={{
            fontSize: '12px',
            color: isDark ? '#334155' : '#94a3b8',
          }}>
            © {year} All rights reserved.
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Support', href: 'mailto:iamahmad3027@gmail.com' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: '12px',
                color: isDark ? '#334155' : '#94a3b8',
                textDecoration: 'none',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => {
                e.target.style.color = '#6366f1'
              }}
              onMouseLeave={e => {
                e.target.style.color = isDark
                  ? '#334155' : '#94a3b8'
              }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
