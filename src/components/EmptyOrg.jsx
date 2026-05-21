import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function EmptyOrg({
  icon = 'corporate_fare',
  title = 'No Organization Yet',
  description = 'Create or join an organization to get started.',
  showButton = true,
}) {
  const navigate = useNavigate()
  const { isDark } = useTheme()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '96px',
        height: '96px',
        borderRadius: '24px',
        background: isDark
          ? 'rgba(99,102,241,0.08)'
          : 'rgba(99,102,241,0.06)',
        border: `2px dashed ${isDark
          ? 'rgba(99,102,241,0.25)'
          : 'rgba(99,102,241,0.2)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative',
      }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '48px',
            color: '#6366f1',
            opacity: 0.5,
          }}>
          {icon}
        </span>
        <div style={{
          position: 'absolute',
          inset: '-8px',
          borderRadius: '32px',
          border: '2px solid rgba(99,102,241,0.12)',
          animation: 'orbit-pulse 2s ease infinite',
        }} />
      </div>

      <h2 style={{
        fontSize: '20px',
        fontWeight: 800,
        color: isDark ? '#e2e8f0' : '#1e293b',
        marginBottom: '10px',
        letterSpacing: '-0.3px',
      }}>
        {title}
      </h2>

      <p style={{
        fontSize: '14px',
        color: isDark ? '#475569' : '#94a3b8',
        maxWidth: '320px',
        lineHeight: 1.6,
        marginBottom: '28px',
      }}>
        {description}
      </p>

      {showButton && (
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 28px',
            borderRadius: '12px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow =
              '0 8px 24px rgba(99,102,241,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow =
              '0 4px 16px rgba(99,102,241,0.3)'
          }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px' }}>
            add_circle
          </span>
          Create Organization
        </button>
      )}
    </div>
  )
}
