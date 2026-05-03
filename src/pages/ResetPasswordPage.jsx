import { useState } from 'react'
import { useSearchParams, useNavigate } from
  'react-router-dom'
import api from '../services/axios'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 chars')
      return
    }
    if (password !== confirm) {
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
        'Reset failed. Link may have expired.'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '6px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#111',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '36px',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '28px',
        }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '12px',
          }}>
            🔑
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'white',
            margin: '0 0 6px',
          }}>
            {success
              ? 'Password Reset!'
              : 'Create New Password'}
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: 0,
          }}>
            {success
              ? 'Redirecting to login...'
              : 'Enter your new password below'}
          </p>
        </div>

        {!success && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#94a3b8',
              }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e =>
                  setPassword(e.target.value)
                }
                placeholder="At least 6 characters"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#94a3b8',
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e =>
                  setConfirm(e.target.value)
                }
                placeholder="Same password again"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleReset()
                }}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: '12px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading
                  ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading
                ? 'Resetting...'
                : 'Reset Password'}
            </button>

            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                cursor: 'pointer',
              }}>
              Back to Login
            </button>
          </>
        )}

        {success && (
          <div style={{
            textAlign: 'center',
            padding: '20px 0',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '12px',
            }}>
              ✅
            </div>
            <p style={{
              color: '#10b981',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              Password updated successfully!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
