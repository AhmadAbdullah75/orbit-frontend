import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerAPI } from '../features/auth/authAPI.js';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import OrbitLogo from '../components/OrbitLogo';
import AuthBackground from '../components/AuthBackground';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();
    const { isDark } = useTheme();

    useEffect(() => {
        // Clear any browser-autofilled values
        // when register page mounts
        setName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
    }, [])

    const handleGoogleLogin = () => {
      const baseUrl = (
        import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_URL
          ?.replace('/api', '') ||
        'https://orbit-backend-production-76bf.up.railway.app'
      ).replace(/\/$/, '')

      window.location.href =
        `${baseUrl}/api/auth/google`
    }

    const getPasswordStrength = (pwd) => {
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return strength;
    };

    const getStrengthColor = (strength) => {
        if (strength <= 1) return 'bg-red-500';
        if (strength === 2) return 'bg-yellow-500';
        if (strength === 3) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const getStrengthLabel = (strength) => {
        if (strength <= 1) return 'Weak';
        if (strength === 2) return 'Fair';
        if (strength === 3) return 'Good';
        return 'Strong';
    };

    const passwordStrength = getPasswordStrength(password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!agreeToTerms) {
            setError('Please agree to terms');
            return;
        }
        if (password.trim() !== password) {
            setError('Password cannot contain leading or trailing spaces');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            await registerAPI({ name, email, password });
            setSuccess(true);
            setTimeout(() => {
                navigate('/verify-email-notice');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const glassCardStyle = {
        background: isDark
            ? 'rgba(17, 17, 27, 0.88)'
            : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '20px',
        border: `1px solid ${isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.9)'}`,
        boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 24px 64px rgba(99,102,241,0.15), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: '36px',
    }

    return (
        <div style={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '20px',
            paddingTop: 'max(20px, 5vh)',
        }}>
            <AuthBackground />

            <div className="fixed top-4 right-4 z-[2]">
                <ThemeToggle />
            </div>

            <div style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '480px',
            }}>
            <main className="w-full">
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
                <p className={`text-sm text-center mb-8 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Create your project workspace
                </p>

                <div style={glassCardStyle}>
                <section className="w-full">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Created!</h3>
                            <p className="text-sm text-gray-500">
                                We sent a verification email to<br />
                                <span className="text-indigo-400 font-medium">{email}</span>
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {/* Full Name Field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className={`h-4 w-4 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        autoComplete="name"
                                        id="register-name"
                                        name="register-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ahmad Abdullah"
                                        required
                                        className={`block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none ${isDark ? 'bg-[#121212] border-[#2a2a2a] text-white placeholder-neutral-700' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className={`h-4 w-4 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        id="register-email"
                                        name="register-email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        required
                                        className={`block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none ${isDark ? 'bg-[#121212] border-[#2a2a2a] text-white placeholder-neutral-700' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        id="register-password"
                                        name="register-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className={`block w-full px-3 py-2.5 pr-10 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none ${isDark ? 'bg-[#121212] border-[#2a2a2a] text-white placeholder-neutral-700' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDark ? 'text-neutral-600 hover:text-neutral-400' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                                {/* Password Strength */}
                                <div className="mt-2.5 flex items-center gap-1 px-1">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div key={level}
                                            className={`h-1 flex-1 rounded-full transition-all duration-300
                                                ${passwordStrength >= level
                                                    ? getStrengthColor(passwordStrength)
                                                    : isDark ? 'bg-[#2a2a2a]' : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                {password && (
                                    <span className={`text-[11px] mt-1 block
                                        ${passwordStrength <= 1 ? 'text-red-400' :
                                            passwordStrength === 2 ? 'text-yellow-400' :
                                                passwordStrength === 3 ? 'text-blue-400' : 'text-green-400'}`}>
                                        {getStrengthLabel(passwordStrength)} password
                                    </span>
                                )}
                                <p className={`text-[11px] ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>Min 8 characters required</p>
                                {password !== password.trim() && (
                                    <p className="text-[11px] text-yellow-500 mt-1">⚠ Warning: Password contains leading or trailing spaces</p>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-1.5">
                                <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        id="register-confirm-password"
                                        name="register-confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className={`block w-full px-3 py-2.5 pr-10 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none ${isDark ? 'bg-[#121212] border-[#2a2a2a] text-white placeholder-neutral-700' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5">
                                        {confirmPassword && password === confirmPassword && (
                                            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className={`${isDark ? 'text-neutral-600 hover:text-neutral-400' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="flex items-start gap-2 py-1">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                                />
                                <label htmlFor="terms" className={`text-xs cursor-pointer leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                                    I agree to Orbit's <Link to="/terms" className="text-indigo-400 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
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

                            {/* Create Account Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Create Account
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Divider */}
                    <div className="relative flex items-center mb-4 mt-6">
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
  <button
    type="button"
    onClick={handleGoogleLogin}
    style={{
      width: '100%',
      padding: '12px',
      borderRadius: '12px',
      border: `1px solid ${isDark
        ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
      background: isDark
        ? 'rgba(255,255,255,0.04)' : 'white',
      color: isDark ? '#e2e8f0' : '#374151',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      transition: 'all 150ms ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = isDark
        ? 'rgba(255,255,255,0.08)' : '#f8fafc'
      e.currentTarget.style.borderColor = isDark
        ? 'rgba(255,255,255,0.2)' : '#d1d5db'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = isDark
        ? 'rgba(255,255,255,0.04)' : 'white'
      e.currentTarget.style.borderColor = isDark
        ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
    }}>
    {/* Google SVG icon */}
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Continue with Google
  </button>

                    <footer className="text-center">
                        <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                            Already have an account?{' '}
                            <Link to="/login" className={`font-medium transition-colors hover:text-indigo-400 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Sign in
                            </Link>
                        </p>
                    </footer>
                </section>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '24px',
                }}>
                    <a
                        href="/privacy"
                        style={{
                            fontSize: '12px',
                            color: isDark ? '#475569' : '#94a3b8',
                            textDecoration: 'none',
                            transition: 'color 150ms',
                        }}
                        onMouseEnter={e =>
                            e.target.style.color = '#6366f1'
                        }
                        onMouseLeave={e =>
                            e.target.style.color =
                                isDark ? '#475569' : '#94a3b8'
                        }
                    >
                        Privacy Policy
                    </a>

                    <span style={{
                        color: isDark ? '#1e293b' : '#e2e8f0',
                        fontSize: '12px',
                    }}>·</span>

                    <a
                        href="/terms"
                        style={{
                            fontSize: '12px',
                            color: isDark ? '#475569' : '#94a3b8',
                            textDecoration: 'none',
                            transition: 'color 150ms',
                        }}
                        onMouseEnter={e =>
                            e.target.style.color = '#6366f1'
                        }
                        onMouseLeave={e =>
                            e.target.style.color =
                                isDark ? '#475569' : '#94a3b8'
                        }
                    >
                        Terms of Service
                    </a>

                    <span style={{
                        color: isDark ? '#1e293b' : '#e2e8f0',
                        fontSize: '12px',
                    }}>·</span>

                    <a
                        href="mailto:iamahmad3027@gmail.com"
                        style={{
                            fontSize: '12px',
                            color: isDark ? '#475569' : '#94a3b8',
                            textDecoration: 'none',
                            transition: 'color 150ms',
                        }}
                        onMouseEnter={e =>
                            e.target.style.color = '#6366f1'
                        }
                        onMouseLeave={e =>
                            e.target.style.color =
                                isDark ? '#475569' : '#94a3b8'
                        }
                    >
                        Support
                    </a>
                </div>
            </main>
            </div>
        </div>
    );
};

export default RegisterPage;
