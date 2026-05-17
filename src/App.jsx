import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { AnimatePresence } from 'framer-motion'
import DashboardLayout from './layouts/DashboardLayout'
import ErrorBoundary from './components/ErrorBoundary'

const LoginPage             = lazy(() => import('./pages/LoginPage'))
const RegisterPage          = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage    = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage     = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailNoticePage = lazy(() => import('./pages/VerifyEmailNoticePage'))
const VerifyEmailPage       = lazy(() => import('./pages/VerifyEmailPage'))
const GoogleAuthSuccessPage = lazy(() => import('./pages/GoogleAuthSuccessPage'))
const DashboardPage         = lazy(() => import('./pages/DashboardPage'))
const ProjectsPage          = lazy(() => import('./pages/ProjectsPage'))
const MembersPage           = lazy(() => import('./pages/MembersPage'))
const SettingsPage          = lazy(() => import('./pages/SettingsPage'))
const ActivityPage          = lazy(() => import('./pages/ActivityPage'))
const BoardPage             = lazy(() => import('./pages/BoardPage'))
const AcceptInvitePage      = lazy(() => import('./pages/AcceptInvitePage'))
const TermsPage             = lazy(() => import('./pages/TermsPage'))
const PrivacyPage           = lazy(() => import('./pages/PrivacyPage'))

// DO NOT import OrganizationPage or BoardPage — they do not exist yet

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center
                  bg-[#f8fafc] dark:bg-[#0a0a0a]">
    <div className="w-8 h-8 border-2 border-indigo-500
                    border-t-transparent rounded-full animate-spin" />
  </div>
)

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector(s => s.auth)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useSelector(s => s.auth)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const location = useLocation()
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login"
            element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"
            element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password"
            element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password"
            element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/verify-email-notice"
            element={<VerifyEmailNoticePage />} />
          <Route path="/verify-email/:token"
            element={<VerifyEmailPage />} />
          <Route path="/auth/google/success"
            element={<GoogleAuthSuccessPage />} />
          <Route path="/invite/accept"
            element={<AcceptInvitePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route element={
            <ProtectedRoute><DashboardLayout /></ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects"  element={<ProjectsPage />} />
            <Route path="/members"   element={<MembersPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="/activity"  element={<ActivityPage />} />
            <Route 
              path="/org/:orgId/projects/:projectId/board" 
              element={<BoardPage />} 
            />
          </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  )
}
