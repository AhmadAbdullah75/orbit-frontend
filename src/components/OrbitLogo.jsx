export default function OrbitLogo({
  size = 36,
  showText = true,
  textSize = 18,
  isDark = true,
}) {
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
        borderRadius: `${size * 0.28}px`,
        background:
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 2px 12px rgba(99,102,241,0.4)',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background:
            'rgba(255,255,255,0.12)',
          borderRadius: 'inherit',
        }} />
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 24 24"
          fill="none"
        >
          <ellipse
            cx="12"
            cy="12"
            rx="8.5"
            ry="3.8"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="1.4"
            fill="none"
            transform="rotate(-35 12 12)"
          />
          <circle
            cx="12"
            cy="12"
            r="2.8"
            fill="white"
          />
          <circle
            cx="20.2"
            cy="9.5"
            r="1.4"
            fill="rgba(255,255,255,0.85)"
          />
        </svg>
      </div>

      {showText && (
        <span style={{
          fontSize: `${textSize}px`,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          background:
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Orbit
        </span>
      )}
    </div>
  )
}
