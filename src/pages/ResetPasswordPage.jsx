  import { useState } from 'react'
  import { useSearchParams, useNavigate }
    from 'react-router-dom'
  import api from '../services/axios'
  import { useTheme } from '../context/ThemeContext'
  import AuthBackground from '../components/AuthBackground'
  import OrbitLogo from '../components/OrbitLogo'

  export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const { isDark } = useTheme()
    const token = params.get('token')

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] =
      useState(false)

    const handleReset = async () => {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 chars')
        return
      }
      if (password.trim() !== confirm.trim()) {
        setError('Passwords do not match')
        return
      }
      setLoading(true)
      setError('')
      try {
        await api.post('/auth/reset-password', {
          token, password
        })
        setSuccess(true)
        setTimeout(() => navigate('/login'), 3000)
      } catch (err) {
        setError(
          err.response?.data?.message ||
          'Reset failed. This link may have expired.'
        )
      } finally {
        setLoading(false)
      }
    }

    const inputStyle = {
      width: '100%',
      padding: '12px 44px 12px 14px',
      borderRadius: '12px',
      border: `1.5px solid ${isDark
        ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
      background: isDark ? '#1e293b' : '#f8fafc',
      color: isDark ? '#f1f5f9' : '#0f172a',
      fontSize: '15px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 150ms',
    }

    return (
      <div style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <AuthBackground />
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '420px',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '32px',
          }}>
            <OrbitLogo size={48} textSize={22} />
          </div>

          {/* Card */}
          <div style={{
            background: isDark ? '#111' : 'white',
            borderRadius: '20px',
            padding: '36px',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.4)'
              : '0 20px 60px rgba(99,102,241,0.08)',
          }}>
            {success ? (
              <div style={{ textAlign: 'center',
                            padding: '20px 0' }}>
                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '32px',
                             color: '#10b981' }}>
                    check_circle
                  </span>
                </div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  marginBottom: '8px',
                }}>
                  Password Updated!
                </h2>
                <p style={{
                  color: isDark ? '#64748b' : '#94a3b8',
                  fontSize: '14px',
                }}>
                  Redirecting to login...
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '28px',
                }}>
                  <div style={{
                    width: '56px', height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(99,102,241,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '28px',
                               color: '#6366f1' }}>
                      lock_reset
                    </span>
                  </div>
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    marginBottom: '6px',
                  }}>
                    Create New Password
                  </h2>
                  <p style={{
                    color: isDark ? '#64748b' : '#94a3b8',
                    fontSize: '14px',
                  }}>
                    Choose a strong password for
                    your account
                  </p>
                </div>

                {/* Password field */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPass(p => !p)
                      }
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isDark
                          ? '#475569' : '#94a3b8',
                        display: 'flex',
                      }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px' }}>
                        {showPass
                          ? 'visibility_off'
                          : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm field */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'block',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => {
                        setConfirm(e.target.value)
                        setError('')
                      }}
                      placeholder="Same password again"
                      autoComplete="new-password"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleReset()
                      }}
                      style={{
                        ...inputStyle,
                        borderColor: confirm
                          ? password.trim() ===
                            confirm.trim()
                            ? '#10b981'
                            : '#ef4444'
                          : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#e2e8f0',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirm(p => !p)
                      }
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isDark
                          ? '#475569' : '#94a3b8',
                        display: 'flex',
                      }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px' }}>
                        {showConfirm
                          ? 'visibility_off'
                          : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {confirm && (
                    <p style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      color: password.trim() ===
                             confirm.trim()
                        ? '#10b981' : '#ef4444',
                    }}>
                      {password.trim() ===
                       confirm.trim()
                        ? '✓ Passwords match'
                        : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#ef4444',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    background: loading
                      ? '#818cf8' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading
                      ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                    transition: 'background 150ms',
                  }}>
                  {loading
                    ? 'Updating...'
                    : 'Update Password'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#64748b' : '#94a3b8',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}>
                  ← Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
