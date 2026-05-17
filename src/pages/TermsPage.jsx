import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const { isDark } = useTheme()
  const navigate = useNavigate()

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
          Terms of Service
        </h1>
        <p style={{
          color: isDark ? '#64748b' : '#94a3b8',
          fontSize: '13px', marginBottom: '32px',
        }}>
          Last updated: May 2026
        </p>

        {[
          {
            title: '1. Acceptance of Terms',
            text: 'By accessing or using Orbit, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.',
          },
          {
            title: '2. Use of Service',
            text: 'Orbit provides project management tools for teams. You agree to use the service only for lawful purposes and in accordance with these terms. You are responsible for maintaining the confidentiality of your account credentials.',
          },
          {
            title: '3. User Accounts',
            text: 'You must provide accurate information when creating an account. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use.',
          },
          {
            title: '4. Data and Privacy',
            text: 'We collect and process data as described in our Privacy Policy. By using Orbit, you consent to such processing and you warrant that all data provided is accurate.',
          },
          {
            title: '5. Intellectual Property',
            text: 'The Orbit platform, including all software, design, and content, is owned by Orbit and protected by intellectual property laws. You may not copy, modify, or distribute our platform without permission.',
          },
          {
            title: '6. Termination',
            text: 'We reserve the right to suspend or terminate your account at any time for violation of these terms. You may delete your account at any time from Settings.',
          },
          {
            title: '7. Limitation of Liability',
            text: 'Orbit is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.',
          },
          {
            title: '8. Contact',
            text: 'For questions about these Terms, contact us at iamahmad3027@gmail.com.',
          },
        ].map((section, i) => (
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
