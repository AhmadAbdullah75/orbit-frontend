import { useTheme } from '../context/ThemeContext'

export default function OrbitLogo({
  size = 36,
  showText = true,
  textSize = 18,
}) {
  const { isDark } = useTheme()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      userSelect: 'none',
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.28)}px`,
        background:
          'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark
          ? '0 2px 12px rgba(99,102,241,0.4)'
          : '0 2px 16px rgba(99,102,241,0.25)',
        flexShrink: 0,
      }}>
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 24 24"
          fill="none">
          <ellipse
            cx="12" cy="12"
            rx="8.5" ry="3.8"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.4"
            transform="rotate(-35 12 12)"
          />
          <circle cx="12" cy="12"
            r="2.8" fill="white" />
          <circle cx="20.2" cy="9.5"
            r="1.4" fill="rgba(255,255,255,0.85)" />
        </svg>
      </div>

      {showText && (
        <div style={{ position: 'relative' }}>
          {/* Main Orbit text */}
          <span style={{
            fontSize: `${textSize}px`,
            fontWeight: 900,
            letterSpacing: '-1px',
            display: 'inline-block',
            position: 'relative',
            /* Gradient text */
            background:
              'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            /* Subtle text shadow for depth */
            filter:
              'drop-shadow(0 1px 2px rgba(99,102,241,0.2))',
            lineHeight: 1,
          }}>
            Orbit
          </span>

          {/* Optional superscript dot accent */}
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '-6px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#a855f7',
            boxShadow: '0 0 6px rgba(168,85,247,0.8)',
            display: textSize >= 16 ? 'block' : 'none',
          }} />
        </div>
      )}
    </div>
  )
}
