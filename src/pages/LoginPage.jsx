import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice.js';
import { loginAPI } from '../features/auth/authAPI.js';
import api from '../services/axios';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import OrbitLogo from '../components/ui/OrbitLogo.jsx';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotLoading, setForgotLoading] =
      useState(false)
    const [forgotMsg, setForgotMsg] = useState('')
    const [forgotError, setForgotError] = useState('')
    const [forgotResetUrl, setForgotResetUrl] = useState(null)
    const [forgotEmailSent, setForgotEmailSent] = useState(false)

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const data = await loginAPI({ email, password });
            dispatch(setCredentials({ user: data.user, token: data.accessToken }));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail.trim()) {
            setForgotError('Please enter your email')
            return
        }
        setForgotLoading(true)
        setForgotError('')
        setForgotMsg('')
        setForgotResetUrl(null)

        try {
            const res = await api.post(
                '/auth/forgot-password',
                { email: forgotEmail.trim() }
            )

            if (res.data.status === 'success') {
                setForgotEmailSent(res.data.emailSent)
                setForgotMsg(
                  res.data.emailSent
                    ? `✅ Reset email sent to ${forgotEmail}. ` +
                      `If it doesn't arrive, use the link below:`
                    : `⚠️ Could not deliver email. ` +
                      `Use this link to reset your password:`
                )
                // Always set the URL — it's always in response
                setForgotResetUrl(res.data.resetUrl)
            }
        } catch (err) {
            setForgotError(
                err.response?.data?.message ||
                'Something went wrong. Try again.'
            )
        } finally {
            setForgotLoading(false)
        }
    }

    return (
        <div className={`min-h-screen flex flex-col items-center 
      justify-center p-4 transition-all duration-300 relative
      ${isDark ? 'bg-[#0f0f0f]' : 'bg-[#f8fafc]'}`}
            style={!isDark ? {
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '24px 24px'
            } : {}}
        >

            {/* Theme Toggle - top right corner */}
            <div className="fixed top-4 right-4">
                <ThemeToggle />
            </div>

            <main className="w-full max-w-sm">
                {/* Brand Header */}
                <OrbitLogo subtitle="Sign in to your project workspace" />

                {/* Login Card */}
                <section className={`orbit-border rounded-2xl p-8 shadow-2xl 
          transition-all duration-300 w-full
          ${isDark
                        ? 'bg-[#1a1a1a] shadow-black/50'
                        : 'bg-white shadow-gray-200/80 border border-gray-100'
                    }`}>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                autoComplete="email"
                                id="login-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 outline-none ${isDark ? 'bg-[#242424] border border-[#2a2a2a] text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                                Password
                            </label>
                            <div className="relative focus-glow rounded-lg">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    id="login-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className={`w-full rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 outline-none ${isDark ? 'bg-[#242424] border border-[#2a2a2a] text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                      setShowPassword(!showPassword)
                                    }}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setShowForgot(true)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6366f1',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    padding: 0,
                                    marginTop: '4px',
                                    display: 'block',
                                    textAlign: 'right',
                                    width: '100%',
                                  }}>
                                  Forgot password?
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 
                  accent-indigo-500 cursor-pointer"
                            />
                            <label
                                htmlFor="remember"
                                className={`text-sm cursor-pointer
                  ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}
                            >
                                Remember me for 30 days
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className={`text-xs rounded-md p-2.5 flex items-center 
      gap-2 border
      ${isDark
                                    ? 'text-red-400 bg-red-400/10 border-red-400/20'
                                    : 'text-red-600 bg-red-50 border-red-200'
                                }`}>
                                <svg width="14" height="14" fill="none" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : 'Login'}
                        </button>
                    </form>

                    {/* Modal is OUTSIDE form, inside section */}
                    {showForgot && (
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.7)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px',
                            backdropFilter: 'blur(4px)',
                        }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '380px',
                                background: isDark ? '#111' : '#fff',
                                borderRadius: '16px',
                                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                padding: '32px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            }}>
                                <h3 style={{
                                    color: isDark ? 'white' : '#1e293b',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    marginBottom: '8px',
                                }}>
                                    Reset Password
                                </h3>
                                <p style={{
                                    color: isDark ? '#64748b' : '#64748b',
                                    fontSize: '13px',
                                    marginBottom: '20px',
                                    lineHeight: 1.5,
                                }}>
                                    Enter your email address and we'll send
                                    you a link to reset your password.
                                </p>

                                {!forgotMsg ? (
                                    <>
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={forgotEmail}
                                            onChange={e =>
                                                setForgotEmail(e.target.value)
                                            }
                                            onKeyDown={e => {
                                                if (e.key === 'Enter')
                                                    handleForgotPassword()
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '11px 14px',
                                                borderRadius: '10px',
                                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                                background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                                color: isDark ? 'white' : '#1e293b',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                marginBottom: '12px',
                                            }}
                                        />
                                        {forgotError && (
                                            <p style={{
                                                color: '#ef4444',
                                                fontSize: '12px',
                                                marginBottom: '12px',
                                            }}>
                                                {forgotError}
                                            </p>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            gap: '10px',
                                        }}>
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                disabled={forgotLoading}
                                                style={{
                                                    flex: 1,
                                                    padding: '11px',
                                                    borderRadius: '10px',
                                                    background: '#6366f1',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    cursor: forgotLoading
                                                        ? 'not-allowed' : 'pointer',
                                                    opacity: forgotLoading ? 0.7 : 1,
                                                }}>
                                                {forgotLoading
                                                    ? 'Sending...' : 'Send Reset Link'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowForgot(false)
                                                    setForgotEmail('')
                                                    setForgotError('')
                                                }}
                                                style={{
                                                    padding: '11px 16px',
                                                    borderRadius: '10px',
                                                    background: 'transparent',
                                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                    color: '#64748b',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                      <p style={{
                                        color: forgotEmailSent ? '#10b981' : '#f59e0b',
                                        fontSize: '13px',
                                        lineHeight: 1.5,
                                        marginBottom: '12px',
                                      }}>
                                        {forgotMsg}
                                      </p>

                                      {/* Always show direct link */}
                                      {forgotResetUrl && (
                                        <div style={{
                                          background: isDark
                                            ? 'rgba(99,102,241,0.1)'
                                            : 'rgba(99,102,241,0.06)',
                                          border: '1px solid rgba(99,102,241,0.25)',
                                          borderRadius: '10px',
                                          padding: '12px',
                                          marginBottom: '12px',
                                        }}>
                                          <p style={{
                                            fontSize: '11px',
                                            color: isDark ? '#64748b' : '#94a3b8',
                                            marginBottom: '8px',
                                          }}>
                                            Direct reset link:
                                          </p>
                                          <a
                                            href={forgotResetUrl}
                                            style={{
                                              display: 'block',
                                              padding: '10px',
                                              background: '#6366f1',
                                              color: 'white',
                                              borderRadius: '8px',
                                              textAlign: 'center',
                                              textDecoration: 'none',
                                              fontSize: '13px',
                                              fontWeight: 600,
                                            }}>
                                            Reset My Password →
                                          </a>
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowForgot(false)
                                          setForgotEmail('')
                                          setForgotMsg('')
                                          setForgotResetUrl(null)
                                          setForgotEmailSent(false)
                                          setForgotError('')
                                        }}
                                        style={{
                                          width: '100%', padding: '10px',
                                          borderRadius: '10px',
                                          background: 'transparent',
                                          border: `1px solid ${isDark
                                            ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                          color: isDark ? '#94a3b8' : '#64748b',
                                          fontSize: '13px', cursor: 'pointer',
                                        }}>
                                        Back to Login
                                      </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="relative flex items-center my-4">
                        <div className={`flex-grow border-t 
    ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`} />
                        <span className={`mx-3 text-xs 
    ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                            or
                        </span>
                        <div className={`flex-grow border-t 
    ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`} />
                    </div>

                    {/* Google Button */}
                    <a
                        href={`${import.meta.env.VITE_SOCKET_URL}/api/auth/google`}
                        className={`w-full flex items-center justify-center gap-3 
    py-2.5 rounded-lg border transition-all duration-200
    font-medium text-sm
    ${isDark
                                ? 'bg-[#242424] border-[#2a2a2a] text-white hover:bg-[#2a2a2a]'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </a>

                    {/* Register Link */}
                    <div className="mt-8 text-center">
                        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                            Don't have an account?{' '}
                            <Link to="/register" className={`font-medium transition-colors hover:text-indigo-400 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Register
                            </Link>
                        </p>
                    </div>
                </section>

                {/* Footer Links */}
                <footer className="mt-8 text-center">
                    <div className={`flex items-center justify-center gap-4 
            text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}
                    >
                        <a href="#"
                            className={`hover:underline transition-colors
                ${isDark
                                    ? 'hover:text-neutral-400'
                                    : 'hover:text-gray-600'}`}
                        >
                            Privacy Policy
                        </a>
                        <span>·</span>
                        <a href="#"
                            className={`hover:underline transition-colors
                ${isDark
                                    ? 'hover:text-neutral-400'
                                    : 'hover:text-gray-600'}`}
                        >
                            Terms of Service
                        </a>
                        <span>·</span>
                        <a href="#"
                            className={`hover:underline transition-colors
                ${isDark
                                    ? 'hover:text-neutral-400'
                                    : 'hover:text-gray-600'}`}
                        >
                            Support
                        </a>
                    </div>
        </footer>
      </main>

    </div>
  );
};

export default LoginPage;
