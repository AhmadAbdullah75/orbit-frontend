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
        className="orbit-wordmark text-center"
        style={{ fontSize: '26px', margin: '6px 0 4px' }}>
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
