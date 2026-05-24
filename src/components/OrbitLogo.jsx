export default function OrbitLogo({
  size = 40,
  showText = true,
  textSize = 20,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size * 0.28}px`,
        background:
          'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 4px 16px rgba(99,102,241,0.4)',
        flexShrink: 0,
      }}>
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
        >
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4.5"
            stroke="white"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            transform="rotate(-30 12 12)"
          />
          <circle
            cx="12"
            cy="12"
            r="2.5"
            fill="white"
          />
          <circle
            cx="19"
            cy="9"
            r="1.5"
            fill="white"
            fillOpacity="0.8"
          />
        </svg>
      </div>

      {showText && (
        <span style={{
          fontSize: `${textSize}px`,
          fontWeight: 800,
          background:
            'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.3px',
        }}>
          Orbit
        </span>
      )}
    </div>
  )
}
