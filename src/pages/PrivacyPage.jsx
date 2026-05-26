  import { useNavigate } from 'react-router-dom'
  import { useTheme } from '../context/ThemeContext'
  import AuthBackground from '../components/AuthBackground'
  import OrbitLogo from '../components/OrbitLogo'

  export default function PrivacyPage() {
    const navigate = useNavigate()
    const { isDark } = useTheme()

    const sections = [
      {
        icon: 'database',
        title: 'Information We Collect',
        text: 'We collect: name, email, and password (encrypted) at registration. Usage data including pages visited and features used. Files you upload as task attachments. Communications you make within the platform.',
      },
      {
        icon: 'analytics',
        title: 'How We Use Your Data',
        text: 'We use your data to: provide and improve the Orbit service, send transactional emails (invitations, password resets), display your profile within your organization, and ensure platform security.',
      },
      {
        icon: 'share',
        title: 'Data Sharing',
        text: 'We do not sell your personal data. We share data only with: other members of your organization (name, avatar, role), and service providers (Resend for email, Cloudinary for file storage, MongoDB for database).',
      },
      {
        icon: 'security',
        title: 'Data Security',
        text: 'Your data is protected by: HTTPS/TLS encryption in transit, bcrypt password hashing, MongoDB Atlas secure cloud storage with encryption at rest, and JWT-based authentication.',
      },
      {
        icon: 'cookie',
        title: 'Cookies',
        text: 'We use secure HTTP-only cookies for authentication sessions. These are essential for the app to function. We do not use tracking or advertising cookies.',
      },
      {
        icon: 'admin_panel_settings',
        title: 'Your Rights',
        text: 'You may: view and update your profile in Settings, delete your account from Settings > Danger Zone, request data export by contacting us. Account deletion removes all your data within 30 days.',
      },
      {
        icon: 'child_care',
        title: 'Children\'s Privacy',
        text: 'Orbit is not intended for users under 13 years of age. We do not knowingly collect personal information from children.',
      },
      {
        icon: 'mail',
        title: 'Contact',
        text: 'For privacy questions or data requests, contact iamahmad3027@gmail.com. We aim to respond within 48 hours.',
      },
    ]

    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <AuthBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        minHeight: '100vh',
        transition: 'background 300ms',
      }}>
        {/* Header */}
        <div style={{
          background: isDark
            ? 'rgba(99,102,241,0.15)'
            : 'rgba(99,102,241,0.06)',
          borderBottom: `1px solid ${isDark
            ? 'rgba(99,102,241,0.2)'
            : 'rgba(99,102,241,0.12)'}`,
          padding: '20px 24px',
        }}>
          <div style={{
            maxWidth: '760px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6366f1',
                fontSize: '14px',
                fontWeight: 600,
                padding: 0,
              }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '18px' }}>
                arrow_back
              </span>
              Back
            </button>
            <div style={{
              width: '1px', height: '20px',
              background: isDark
                ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            }} />
            <OrbitLogo size={28} textSize={16} />
          </div>
        </div>

        {/* Hero */}
        <div style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '48px 24px 24px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: isDark
              ? 'rgba(99,102,241,0.1)'
              : 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            marginBottom: '16px',
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: '14px',
                       color: '#6366f1' }}>
              privacy_tip
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#6366f1',
            }}>
              Legal Document
            </span>
          </div>

          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            letterSpacing: '-0.5px',
            marginBottom: '12px',
            lineHeight: 1.2,
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontSize: '15px',
            color: isDark ? '#64748b' : '#94a3b8',
            marginBottom: '8px',
          }}>
            Last updated: May 2026 · Effective immediately
          </p>
          <p style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: isDark ? '#94a3b8' : '#64748b',
            maxWidth: '600px',
          }}>
            Please read these terms carefully before
            using Orbit. By using our platform, you
            agree to be bound by these terms.
          </p>
        </div>

        {/* Divider */}
        <div style={{
          maxWidth: '760px',
          margin: '0 auto 32px',
          padding: '0 24px',
        }}>
          <div style={{
            height: '1px',
            background: isDark
              ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
          }} />
        </div>

        {/* Sections */}
        <div style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {sections.map((section, i) => (
            <div
              key={i}
              style={{
                background: isDark
                  ? '#111' : 'white',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
              }}>
              <div style={{
                width: '40px', height: '40px',
                borderRadius: '10px',
                background: isDark
                  ? 'rgba(99,102,241,0.1)'
                  : 'rgba(99,102,241,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px',
                           color: '#6366f1' }}>
                  {section.icon}
                </span>
              </div>
              <div>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  marginBottom: '8px',
                }}>
                  {i + 1}. {section.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: isDark ? '#94a3b8' : '#64748b',
                  margin: 0,
                }}>
                  {section.text}
                </p>
              </div>
            </div>
          ))}

          {/* Footer note */}
          <div style={{
            background: isDark
              ? 'rgba(99,102,241,0.06)'
              : 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '14px',
            padding: '20px 24px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '14px',
              color: isDark ? '#64748b' : '#94a3b8',
              marginBottom: '12px',
            }}>
              Also see our
            </p>
            <button
              onClick={() => navigate('/terms')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #6366f1',
                background: 'transparent',
                color: '#6366f1',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              Terms of Service →
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>
    )
  }
