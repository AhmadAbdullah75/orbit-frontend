import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordAPI } from '../features/auth/authAPI.js';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import OrbitLogo from '../components/ui/OrbitLogo.jsx';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { isDark } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await forgotPasswordAPI(email);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`min-h-screen flex flex-col items-center 
        justify-center p-4 transition-all duration-300
        ${isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8fafc]'}`}
            style={!isDark ? {
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            } : {}}
        >
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <main className="w-full max-w-md">
                <OrbitLogo subtitle="Reset your password" />

                {!success ? (
                    <section className={`rounded-2xl p-8 shadow-2xl border
            transition-all duration-300
            ${isDark
                            ? 'bg-[#1a1a1a] border-[#2a2a2a] shadow-black/50'
                            : 'bg-white border-slate-100 shadow-slate-200/80'}`}>

                        {/* Info Box */}
                        <div className={`mb-6 p-4 rounded-lg border text-sm
              font-medium leading-relaxed flex items-start gap-3
              ${isDark
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                            <svg width="18" height="18" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                viewBox="0 0 24 24" className="shrink-0 mt-0.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Enter your email and we'll send you a reset link
                            to get back into your account.
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold 
                  tracking-widest uppercase block
                  ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className={`absolute inset-y-0 left-0 
                    flex items-center pl-3
                    ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                                        <svg width="20" height="20" fill="none"
                                            stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round"
                                            viewBox="0 0 24 24">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 
                        0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 
                        00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        required
                                        className={`block w-full pl-10 pr-4 py-3 
                      rounded-xl text-sm transition-all outline-none
                      focus:ring-2 focus:ring-indigo-500/20 
                      focus:border-indigo-500
                      ${isDark
                                                ? 'bg-[#121212] border border-[#2a2a2a] text-white placeholder-gray-600'
                                                : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`}
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className={`text-xs rounded-md p-2.5 
                  flex items-center gap-2 border
                  ${isDark
                                        ? 'text-red-400 bg-red-400/10 border-red-400/20'
                                        : 'text-red-600 bg-red-50 border-red-200'}`}>
                                    <svg width="14" height="14" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round"
                                        viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500
                  disabled:opacity-70 disabled:cursor-not-allowed
                  text-white font-semibold py-3.5 rounded-xl
                  flex items-center justify-center gap-2
                  transition-all duration-200 active:scale-[0.98]
                  shadow-lg shadow-indigo-500/20"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12"
                                            r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <span>Send Reset Link</span>
                                        <svg width="16" height="16" fill="none"
                                            stroke="currentColor" strokeWidth="2"
                                            strokeLinecap="round" strokeLinejoin="round"
                                            viewBox="0 0 24 24">
                                            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            {/* Divider */}
                            <div className="relative flex items-center py-1">
                                <div className={`flex-grow border-t
                  ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`} />
                            </div>

                            {/* Sign In Link */}
                            <p className={`text-center text-sm
                ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                                Remember your password?{' '}
                                <Link to="/login"
                                    className={`font-semibold transition-colors
                    hover:text-indigo-400
                    ${isDark ? 'text-white' : 'text-indigo-600'}`}>
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    </section>
                ) : (
                    /* Success State */
                    <section className={`rounded-2xl p-8 shadow-2xl border
            text-center transition-all duration-300
            ${isDark
                            ? 'bg-[#1a1a1a] border-[#2a2a2a] shadow-black/50'
                            : 'bg-white border-slate-100'}`}>

                        <div className="w-16 h-16 bg-green-500/10 border
              border-green-500/20 rounded-full flex items-center
              justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none"
                                stroke="currentColor" strokeWidth="2"
                                viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className={`text-xl font-semibold mb-2
              ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Reset link sent!
                        </h3>
                        <p className={`text-sm mb-6
              ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                            We sent a password reset link to{' '}
                            <span className="text-indigo-400 font-medium">
                                {email}
                            </span>
                        </p>

                        <div className={`text-xs rounded-lg p-3 mb-6 border
              ${isDark
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                            Didn't receive it? Check your spam folder.
                        </div>

                        <Link to="/login"
                            className="w-full block bg-indigo-600 
                hover:bg-indigo-500 text-white font-medium 
                py-3 rounded-xl transition-all duration-200 
                text-sm text-center">
                            Back to Login
                        </Link>
                    </section>
                )}

                {/* Page Footer */}
                <footer className="mt-8 text-center">
                    <div className={`flex items-center justify-center 
            gap-4 text-xs
            ${isDark ? 'text-neutral-600' : 'text-slate-400'}`}>
                        <a href="#" className="hover:underline">Privacy Policy</a>
                        <span>·</span>
                        <a href="#" className="hover:underline">Terms of Service</a>
                        <span>·</span>
                        <a href="#" className="hover:underline">Support</a>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default ForgotPasswordPage;
