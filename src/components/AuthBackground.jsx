import { useTheme } from '../context/ThemeContext'

export default function AuthBackground() {
  const { isDark } = useTheme()

  const blobs = isDark ? [
    {
      color: 'rgba(99, 102, 241, 0.35)',
      size: '600px',
      top: '-10%',
      left: '-10%',
      animation: 'orbit-blob-1 18s ease infinite',
      delay: '0s',
    },
    {
      color: 'rgba(139, 92, 246, 0.3)',
      size: '500px',
      top: '50%',
      right: '-15%',
      animation: 'orbit-blob-2 22s ease infinite',
      delay: '-5s',
    },
    {
      color: 'rgba(59, 130, 246, 0.25)',
      size: '450px',
      bottom: '-15%',
      left: '20%',
      animation: 'orbit-blob-3 20s ease infinite',
      delay: '-10s',
    },
    {
      color: 'rgba(168, 85, 247, 0.2)',
      size: '350px',
      top: '30%',
      left: '30%',
      animation: 'orbit-blob-4 25s ease infinite',
      delay: '-8s',
    },
  ] : [
    {
      color: 'rgba(99, 102, 241, 0.35)',
      size: '700px',
      top: '-20%',
      left: '-15%',
      animation: 'orbit-blob-1 18s ease infinite',
      delay: '0s',
    },
    {
      color: 'rgba(139, 92, 246, 0.3)',
      size: '600px',
      bottom: '-20%',
      right: '-15%',
      animation: 'orbit-blob-2 22s ease infinite',
      delay: '-5s',
    },
    {
      color: 'rgba(56, 189, 248, 0.25)',
      size: '500px',
      top: '-10%',
      right: '10%',
      animation: 'orbit-blob-3 20s ease infinite',
      delay: '-10s',
    },
    {
      color: 'rgba(236, 72, 153, 0.18)',
      size: '400px',
      bottom: '0%',
      left: '15%',
      animation: 'orbit-blob-4 25s ease infinite',
      delay: '-8s',
    },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      background: isDark ? '#06060f' : '#ffffff',
      pointerEvents: 'none',
    }}>
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="orbit-blob"
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(
              circle,
              ${blob.color} 0%,
              transparent 70%
            )`,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
            animation: blob.animation,
            animationDelay: blob.delay,
            filter: isDark ? 'blur(40px)' : 'blur(60px)',
            willChange: 'transform',
          }}
        />
      ))}

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: isDark
          ? `radial-gradient(
              circle,
              rgba(255,255,255,0.08) 1px,
              transparent 1px
            )`
          : `radial-gradient(
              circle,
              rgba(99,102,241,0.18) 1px,
              transparent 1px
            )`,
        backgroundSize: '32px 32px',
        animation: 'orbit-grid-fade 6s ease infinite',
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: isDark
          ? `radial-gradient(
              ellipse at center,
              transparent 40%,
              rgba(0,0,0,0.6) 100%
            )`
          : `radial-gradient(
              ellipse at center,
              transparent 30%,
              rgba(255,255,255,0.75) 100%
            )`,
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: isDark ? 0.03 : 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '128px 128px',
      }} />
    </div>
  )
}
