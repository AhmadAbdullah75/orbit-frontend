import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import OrbitLogo from '../components/ui/OrbitLogo.jsx';

const VerifyEmailNoticePage = () => {
    const { isDark } = useTheme();
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-300 relative ${isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8fafc]'}`}
            style={!isDark ? {
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            } : {}}
        >
            <div className="fixed top-4 right-4">
                <ThemeToggle />
            </div>

            <main className="w-full max-w-sm">
                <OrbitLogo subtitle="Almost there!" />

                <div className={`w-full rounded-2xl p-8 text-center border shadow-2xl transition-all duration-300 ${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a] shadow-black/50' : 'bg-white border-gray-100 shadow-gray-200/80'}`}>

                    <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>

                    <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Check your email</h2>
                    <p className={`text-sm mb-6 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                        We sent a verification link to your email address.
                        Click the link to activate your account.
                    </p>

                    <div className={`text-xs rounded-lg p-3 mb-6 ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'}`}>
                        Didn't receive it? Check your spam folder.
                    </div>

                    <Link to="/login"
                        className="w-full block bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg shadow-indigo-500/20">
                        Back to Login
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmailNoticePage;
