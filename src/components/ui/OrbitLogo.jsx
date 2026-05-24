import { useTheme } from '../../context/ThemeContext.jsx'
import OrbitLogo from '../OrbitLogo.jsx'

const OrbitLogoWithSubtitle = ({ subtitle }) => {
  const { isDark } = useTheme()
  return (
    <div className="flex flex-col items-center mb-8">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '8px',
      }}>
        <OrbitLogo size={52} showText={false} />
      </div>
      <h1
        className={`text-3xl font-bold tracking-tight mb-1 text-center
    ${isDark ? 'text-white' : 'text-gray-900'}`}
        style={isDark ? {
          background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        } : {
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Orbit
      </h1>
      {subtitle && (
        <p className={`text-sm text-center ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default OrbitLogoWithSubtitle
