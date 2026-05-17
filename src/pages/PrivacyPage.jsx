import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const sections = [
    {
      title: '1. Information We Collect',
      text: 'We collect information you provide directly: name, email address, and password when you register. We also collect usage data including pages visited, features used, and actions performed within the app.',
    },
    {
      title: '2. How We Use Your Information',
      text: 'We use your information to provide and improve Orbit, send transactional emails (invitations, password resets), and communicate service updates. We do not sell your personal data to third parties.',
    },
    {
      title: '3. Data Storage',
      text: 'Your data is stored securely on MongoDB Atlas servers. We use industry-standard encryption for data in transit (HTTPS/TLS) and at rest.',
    },
    {
      title: '4. Third-Party Services',
      text: 'We use Resend for email delivery, Cloudinary for file storage, and Google OAuth for authentication. Each service has its own privacy policy governing their data use.',
    },
    {
      title: '5. Cookies',
      text: 'We use secure HTTP-only cookies for authentication sessions. These are necessary for the app to function and cannot be opted out of while using the service.',
    },
    {
      title: '6. Your Rights',
      text: 'You may access, update, or delete your account data at any time from Settings. To request complete data deletion, contact us at iamahmad3027@gmail.com.',
    },
    {
      title: '7. Contact',
      text: 'For privacy questions, contact iamahmad3027@gmail.com.',
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#0a0a0a' : '#f8fafc',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        background: isDark ? '#111' : 'white',
        borderRadius: '16px',
        padding: '40px',
        border: `1px solid ${isDark
          ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center',
            gap: '6px', background: 'none',
            border: 'none', cursor: 'pointer',
            color: '#6366f1', fontSize: '14px',
            marginBottom: '24px', padding: 0,
          }}>
          ← Back
        </button>

        <h1 style={{
          fontSize: '28px', fontWeight: 800,
          color: isDark ? '#f1f5f9' : '#0f172a',
          marginBottom: '8px',
        }}>
          Privacy Policy
        </h1>
        <p style={{
          color: isDark ? '#64748b' : '#94a3b8',
          fontSize: '13px', marginBottom: '32px',
        }}>
          Last updated: May 2026
        </p>

        {sections.map((section, i) => (
          <div key={i} style={{
            marginBottom: '24px',
          }}>
            <h3 style={{
              fontSize: '15px', fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#1e293b',
              marginBottom: '8px',
            }}>
              {section.title}
            </h3>
            <p style={{
              fontSize: '14px', lineHeight: 1.7,
              color: isDark ? '#94a3b8' : '#64748b',
            }}>
              {section.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
