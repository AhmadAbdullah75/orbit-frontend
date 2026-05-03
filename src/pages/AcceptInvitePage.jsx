import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/axios'

export default function AcceptInvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [status, setStatus] = useState('loading')
  const [orgData, setOrgData] = useState(null)
  const [regForm, setRegForm] = useState({
    name: '', password: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    // Try to accept invite
    api.post('/organizations/invite/accept',
      { token }
    ).then(res => {
      if (res.data.status === 'needs_registration') {
        setOrgData(res.data.data)
        setStatus('register')
      } else {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      }
    }).catch(err => {
      setError(
        err.response?.data?.message ||
        'Invalid or expired invitation.'
      )
      setStatus('invalid')
    })
  }, [token, navigate])

  const handleRegister = async () => {
    if (!regForm.name.trim() ||
        !regForm.password) {
      setError('Name and password are required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      // Register user
      await api.post('/auth/register', {
        name: regForm.name.trim(),
        email: orgData.email,
        password: regForm.password,
      })
      // Accept invitation after registering
      await api.post(
        '/organizations/invite/accept',
        { token }
      )
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Registration failed'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: '#0a0a0a',
    }}>
      <div style={{ textAlign: 'center',
                    color: 'white' }}>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '50%',
          border: '3px solid #6366f1',
          borderTop: '3px solid transparent',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p>Verifying invitation...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (status === 'success') return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: '#0a0a0a', color: 'white',
      textAlign: 'center',
    }}>
      <div>
        <div style={{ fontSize: '48px',
                      marginBottom: '16px' }}>
          🎉
        </div>
        <h2 style={{ fontSize: '22px',
                     fontWeight: 700,
                     marginBottom: '8px' }}>
          You've joined successfully!
        </h2>
        <p style={{ color: '#94a3b8' }}>
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: '#0a0a0a', color: 'white',
      textAlign: 'center', padding: '20px',
    }}>
      <div>
        <div style={{ fontSize: '48px',
                      marginBottom: '16px' }}>
          ❌
        </div>
        <h2 style={{ fontSize: '20px',
                     fontWeight: 700,
                     marginBottom: '8px' }}>
          Invalid Invitation
        </h2>
        <p style={{ color: '#94a3b8',
                    marginBottom: '20px' }}>
          {error || 'This invitation link is invalid or has expired.'}
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            background: '#6366f1',
            color: 'white', border: 'none',
            cursor: 'pointer', fontSize: '14px',
            fontWeight: 600,
          }}>
          Go to Login
        </button>
      </div>
    </div>
  )

  // status === 'register'
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: '#0a0a0a', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#111', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '32px',
      }}>
        <div style={{ textAlign: 'center',
                      marginBottom: '24px' }}>
          <div style={{ fontSize: '36px',
                        marginBottom: '12px' }}>
            🚀
          </div>
          <h2 style={{ fontSize: '20px',
                       fontWeight: 700,
                       color: 'white',
                       marginBottom: '6px' }}>
            Join {orgData?.orgName || 'the team'}
          </h2>
          <p style={{ fontSize: '13px',
                      color: '#64748b' }}>
            You've been invited as{' '}
            <strong style={{ color: '#6366f1' }}>
              {orgData?.role}
            </strong>
          </p>
          <p style={{ fontSize: '12px',
                      color: '#475569',
                      marginTop: '4px' }}>
            {orgData?.email}
          </p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            fontSize: '12px', fontWeight: 600,
            color: '#94a3b8', display: 'block',
            marginBottom: '6px',
          }}>
            Full Name
          </label>
          <input
            type="text"
            placeholder="Your full name"
            value={regForm.name}
            onChange={e => setRegForm(f => ({
              ...f, name: e.target.value
            }))}
            style={{
              width: '100%', padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'white', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            fontSize: '12px', fontWeight: 600,
            color: '#94a3b8', display: 'block',
            marginBottom: '6px',
          }}>
            Create Password
          </label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={regForm.password}
            onChange={e => setRegForm(f => ({
              ...f, password: e.target.value
            }))}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRegister()
            }}
            style={{
              width: '100%', padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'white', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{
            fontSize: '12px', color: '#ef4444',
            marginBottom: '14px',
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleRegister}
          disabled={submitting}
          style={{
            width: '100%', padding: '12px',
            borderRadius: '10px',
            background: '#6366f1',
            color: 'white', border: 'none',
            fontSize: '14px', fontWeight: 700,
            cursor: submitting
              ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting
            ? 'Creating account...'
            : 'Create Account & Join'}
        </button>
      </div>
    </div>
  )
}
