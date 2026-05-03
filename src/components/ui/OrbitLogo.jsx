import { useTheme } from '../../context/ThemeContext.jsx';

const OrbitLogo = ({ subtitle }) => {
    const { isDark } = useTheme();
    return (
        <div className="flex flex-col items-center mb-8">
            <div
                className="w-14 h-14 rounded-xl flex items-center 
          justify-center mb-4"
                style={{
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 0 28px 4px rgba(99, 102, 241, 0.4)'
                }}
            >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="2.5" fill="white" />
                    <path
                        d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 
              21 12 21C16.9706 21 21 16.9706 21 12"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <circle cx="20.5" cy="7.5" r="1.5" fill="white" />
                    <path
                        d="M5 5.5C7 3.5 9.5 2.5 12 2.5"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            <h1
                className={`text-3xl font-bold tracking-tight mb-1
    ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={isDark ? {
                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                } : {}}
            >
                Orbit
            </h1>
            {subtitle && (
                <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default OrbitLogo;
