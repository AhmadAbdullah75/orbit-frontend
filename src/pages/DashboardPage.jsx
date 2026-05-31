import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { setCredentials } from '../store/slices/authSlice'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, scaleIn } from '../utils/animations'
import { useCountUp } from '../hooks/useCountUp'
import useAutoRefresh from '../hooks/useAutoRefresh'
import OrbitLogo from '../components/OrbitLogo'
import { getPermissions } from '../utils/permissions'


function StatNumber({ value }) {
  const isPercentage = typeof value === 'string' && value.includes('%')
  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0
  const count = useCountUp(numericValue)
  
  if (value === null) return <span>—</span>
  return <span>{count}{isPercentage ? '%' : ''}</span>
}


const DashboardPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token, activeOrgId } = useSelector(s => s.auth)
  const { isDark } = useTheme()
  const { userRole } = useOutletContext() || { userRole: 'viewer' }
  const perms = getPermissions(userRole)

  const formatAction = (action) => {
    if (!action || typeof action !== 'string') {
      return (
        <span style={{
          color: isDark ? '#64748b' : '#94a3b8'
        }}>
          performed an action
        </span>
      )
    }

    const clean = action.replace(/['"]/g, '').trim()
    const lc = clean.toLowerCase()

    const gray = (text, key) => (
      <span key={key} style={{
        color: isDark ? '#64748b' : '#94a3b8',
      }}>
        {text}
      </span>
    )

    const bold = (text, key) => (
      <strong key={key} style={{
        fontWeight: 700,
        color: isDark ? '#f1f5f9' : '#0f172a',
      }}>
        {text}
      </strong>
    )

    // ── MOVE PATTERN ─────────────────────────────
    // "moved task X from A to B"
    // "moved task from A to B"  (empty task name)
    // Uses indexOf NOT regex — regex fails on empty
    // task names between "task" and "from"
    const fromIdx = lc.indexOf(' from ')
    if (fromIdx !== -1) {
      const beforeFrom = clean.substring(0, fromIdx)
      const afterFrom = clean.substring(fromIdx + 6)
      const afterFromLc = afterFrom.toLowerCase()

      // Find FIRST " to " in the afterFrom segment
      const toInAfter = afterFromLc.indexOf(' to ')

      if (toInAfter !== -1) {
        const fromCol = afterFrom.substring(0, toInAfter)
        const toCol = afterFrom.substring(toInAfter + 4)

        // Parse beforeFrom for "verb task [taskName]"
        const taskWordIdx =
          beforeFrom.toLowerCase().indexOf(' task')
        if (taskWordIdx !== -1) {
          const verb = beforeFrom.substring(
            0, taskWordIdx
          )
          const taskName = beforeFrom.substring(
            taskWordIdx + 5
          ).trim()

          return (
            <>
              {gray(verb + ' task ', 'v')}
              {taskName
                ? bold(taskName + ' ', 'tn')
                : null
              }
              {gray('from ', 'f')}
              {bold(fromCol + ' ', 'fc')}
              {gray('to ', 'to')}
              {bold(toCol, 'tc')}
            </>
          )
        }
      }
    }

    // ── TASK PATTERN ─────────────────────────────
    // "created task Fix Login Bug"
    // "deleted task 26622772"
    // "updated task Hello"
    // "commented on task Hello"
    // "assigned task Hello"
    const taskIdx = lc.indexOf(' task ')
    if (taskIdx !== -1) {
      const prefix = clean.substring(0, taskIdx)
      const taskName = clean.substring(taskIdx + 6).trim()
      if (taskName) {
        return (
          <>
            {gray(prefix + ' task ', 'p')}
            {bold(taskName, 'tn')}
          </>
        )
      }
    }

    // ── PROJECT PATTERN ──────────────────────────
    // "created project Ahmad Project"
    // "deleted project Test"
    const projIdx = lc.indexOf(' project ')
    if (projIdx !== -1) {
      const prefix = clean.substring(0, projIdx)
      const projName =
        clean.substring(projIdx + 9).trim()
      if (projName) {
        return (
          <>
            {gray(prefix + ' project ', 'pp')}
            {bold(projName, 'pn')}
          </>
        )
      }
    }

    // ── INVITE PATTERN ───────────────────────────
    // "invited test@gmail.com to the organization"
    if (lc.startsWith('invited ') &&
        lc.includes(' to the organization')) {
      const email = clean
        .substring(8)
        .replace(' to the organization', '')
        .trim()
      return (
        <>
          {gray('invited ', 'iv')}
          {bold(email + ' ', 'em')}
          {gray('to the organization', 'io')}
        </>
      )
    }

    // ── REMOVED PATTERN ──────────────────────────
    // "removed Ahmad Ali from the organization"
    if (lc.startsWith('removed ') &&
        lc.includes(' from the organization')) {
      const name = clean
        .substring(8)
        .replace(' from the organization', '')
        .trim()
      return (
        <>
          {gray('removed ', 'rm')}
          {bold(name + ' ', 'rn')}
          {gray('from the organization', 'rf')}
        </>
      )
    }

    // ── ROLE CHANGE PATTERN ──────────────────────
    // "changed role of Ahmad to admin"
    if (lc.startsWith('changed role of ')) {
      const rest = clean.substring(16)
      const lastTo = rest.toLowerCase()
        .lastIndexOf(' to ')
      if (lastTo !== -1) {
        const name = rest.substring(0, lastTo)
        const role = rest.substring(lastTo + 4)
        return (
          <>
            {gray('changed role of ', 'cr')}
            {bold(name + ' ', 'crn')}
            {gray('to ', 'crt')}
            {bold(role, 'crr')}
          </>
        )
      }
    }

    // ── FALLBACK ─────────────────────────────────
    return gray(clean, 'fb')
  }
  const firstName = user?.name?.split(' ')[0] || 'there'

  // orgId from Redux activeOrgId or user organization
  const orgId = activeOrgId
             || user?.organization?._id
             || (typeof user?.organization === 'string'
                 ? user.organization : null)

  const [hasOrg, setHasOrg] = useState(Boolean(orgId))
  const [currentOrgId, setCurrentOrgId] = useState(orgId)

  // Stats
  const [stats, setStats] = useState({
    totalProjects: null,
    activeTasks: null,
    teamMembers: null,
    productivity: null,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const [recentActivity, setRecentActivity] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString('en-US',
      { month: 'short', day: 'numeric' })
  }

  // Org modal
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgFormName, setOrgFormName] = useState('')
  const [orgError, setOrgError] = useState('')
  const [creating, setCreating] = useState(false)
  const modalRef = useRef(null)

  // Close modal on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowOrgModal(false)
        setOrgFormName('')
        setOrgError('')
      }
    }
    if (showOrgModal) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showOrgModal])

  // Fetch stats when org exists
  useEffect(() => {
    if (!activeOrgId) {
       // fallback if activeOrgId not set
       if (orgId) {
         setCurrentOrgId(orgId)
         setHasOrg(true)
       } else {
         setStatsLoading(false)
         setHasOrg(false)
       }
    } else {
       setCurrentOrgId(activeOrgId)
       setHasOrg(true)
    }
  }, [activeOrgId, orgId])

  useEffect(() => {
    if (!currentOrgId) {
      setStatsLoading(false)
      return
    }
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId])

  const fetchStats = async () => {
    try {
      // Fetch members and activity separately as well for robustness
      try {
        const [membersRes, activityRes] = await Promise.all([
          api.get(`/organizations/${currentOrgId}/members`),
          api.get(`/organizations/${currentOrgId}/activity`),
        ])
        const members = membersRes.data?.data?.members || []
        const activities = activityRes.data?.data?.activities || []
        setStats(prev => ({ ...prev, teamMembers: members.length }))
        setRecentActivity(activities)
      } catch (depErr) {
        console.error('Dependencies fetch error:', depErr)
      }

      // Fetch projects first — isolated try-catch
      let projects = []
      try {
        const projRes = await api.get(
          `/organizations/${currentOrgId}/projects`
        )
        projects = projRes.data?.data?.projects || []
      } catch (projErr) {
        console.error('Projects fetch error:', projErr)
        // Continue with empty projects — don't crash
      }

      // Only fetch stats if we have projects
      if (projects.length > 0) {
        try {
          const statsPromises = projects
            .slice(0, 5)
            .map(p =>
              api.get(
                `/organizations/${currentOrgId}/projects/${p._id}/stats`
              ).catch(() => ({
                data: { data: { total: 0, done: 0 } }
              }))
            )
          const statsResults = await Promise.all(
            statsPromises
          )
          const totalTasks = statsResults.reduce(
            (sum, r) =>
              sum + (r?.data?.data?.total || 0), 0
          )
          const doneTasks = statsResults.reduce(
            (sum, r) =>
              sum + (r?.data?.data?.done || 0), 0
          )
          const prod = totalTasks > 0
            ? Math.round((doneTasks / totalTasks) * 100)
            : null

          setStats(prev => ({
            ...prev,
            totalProjects: projects.length,
            activeTasks: totalTasks - doneTasks,
            productivity: prod !== null ? `${prod}%` : '0%',
          }))
        } catch (statsErr) {
          console.error('Stats fetch error:', statsErr)
        }
      } else {
        setStats(prev => ({
          ...prev,
          totalProjects: 0,
          activeTasks: 0,
          productivity: '0%',
        }))
      }
    } catch (err) {
      console.error('fetchStats outer error:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useAutoRefresh(
    () => { if (currentOrgId) fetchStats() },
    60000,
    [currentOrgId]
  )

  // Checklist derived from real state
  const step1Done = Boolean(user?.isVerified)
  const step2Done = Boolean(hasOrg)
  const step3Done = typeof stats.totalProjects === 'number'
                 && stats.totalProjects > 0
  const step4Done = typeof stats.teamMembers === 'number'
                 && stats.teamMembers > 1

  const checklistItems = [
    { id: 1, label: 'Verify your email',
      sub: 'Required to activate your account',
      done: step1Done, locked: false,
      isCurrentStep: !step1Done },
    { id: 2, label: 'Create your organization',
      sub: 'Set up your company workspace',
      done: step2Done, locked: false,
      isCurrentStep: step1Done && !step2Done },
    { id: 3, label: 'Launch your first initiative',
      sub: "Start organizing your team's work",
      done: step3Done, locked: !step2Done,
      isCurrentStep: step2Done && !step3Done },
    { id: 4, label: 'Invite your collaborators',
      sub: 'Collaborate with your team',
      done: step4Done, locked: !step2Done,
      isCurrentStep: step2Done && step3Done && !step4Done },
  ]

  const completedCount = checklistItems.filter(i => i.done).length
  const progressPercent = Math.round((completedCount / 4) * 100)

  // Create org — REAL API CALL
  const handleCreateOrg = async () => {
    if (!orgFormName.trim()) {
      setOrgError('Organization name is required')
      return
    }
    setCreating(true)
    setOrgError('')
    try {
      // Step 1: Create org
      const res = await api.post('/organizations', {
        name: orgFormName.trim()
      })
      const org = res.data?.data?.organization || res.data
      const newOrgId = org?._id
      if (!newOrgId) throw new Error('No org ID returned')

      // Step 2: Re-fetch user to get updated organization field
      const meRes = await api.get('/auth/me')
      const updatedUser = meRes.data?.user || meRes.data
      dispatch(setCredentials({ user: updatedUser, token }))

      setHasOrg(true)
      setCurrentOrgId(newOrgId)
      setShowOrgModal(false)
      setOrgFormName('')
      showToast('Organization created successfully!')
    } catch (err) {
      console.error('Create org error:', err)
      const msg = err.response?.data?.message || 'Failed to create organization'
      setOrgError(msg)
      showToast(msg, 'error')
    } finally {
      setCreating(false)
    }
  }

  if (!hasOrg && !statsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 min-h-[80vh]">
        <div className="relative mb-8 animate-float">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl scale-150 animate-glow-pulse" />
          <OrbitLogo size={64} showText={false} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">
          Welcome to Orbit, {firstName}! 🚀
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
          The next-gen project management platform. <br/>
          Let's start by creating your first organization.
        </p>
        <button 
          onClick={() => setShowOrgModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-3 px-10 py-4 rounded-xl font-bold shadow-xl shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
        >
          <span className="material-symbols-outlined">add</span>
          Create Workspace
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-6 italic">You'll be able to invite your team once the workspace is ready.</p>

        {showOrgModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4">
            <div ref={modalRef} className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl w-full max-w-md p-6 text-left">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Organization</h2>
              <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">This will be your team's workspace in Orbit.</p>
              
              <div className="mt-5 text-left">
                <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Organization Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Acme Corp, TechSoft..."
                  value={orgFormName}
                  onChange={(e) => { setOrgFormName(e.target.value); setOrgError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                {orgError && <p className="text-red-500 text-xs mt-1.5">{orgError}</p>}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => { setShowOrgModal(false); setOrgFormName(''); setOrgError(''); }}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrg}
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                      Creating...
                    </>
                  ) : 'Create Organization'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-8 pb-12 pt-8 px-6">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-12 px-8 md:px-14 rounded-2xl bg-white dark:bg-[#0f0f0f] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_20px_40px_rgba(99,102,241,0.04)] dark:shadow-none transition-colors duration-150">
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-indigo-400/12 dark:bg-indigo-500/8 blur-[80px] animate-pulse pointer-events-none z-0" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-20 -right-10 w-[300px] h-[300px] rounded-full bg-violet-400/10 dark:bg-purple-500/6 blur-[60px] animate-pulse pointer-events-none z-0" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full bg-indigo-400/5 dark:bg-indigo-400/4 blur-[100px] pointer-events-none z-0" />

          <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.025] pointer-events-none z-0"
               style={{
                 backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
                 backgroundSize: '40px 40px',
               }} />

          <div className="absolute top-0 left-0 right-0 h-px z-0"
               style={{
                 background: `linear-gradient(90deg, transparent, rgba(99,102,241,${isDark ? '0.5' : '0.25'}), rgba(168,85,247,0.3), transparent)`
               }} />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <OrbitLogo size={64} showText={false} />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2
                className="text-hero"
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  letterSpacing: '-0.5px',
                  marginBottom: '8px',
                  lineHeight: 1.2,
                }}>
                Welcome back, {firstName}! 👋
              </h2>
              <p style={{
                fontSize: '15px',
                color: isDark ? '#64748b' : '#94a3b8',
                maxWidth: '24rem',
                margin: '0 auto',
              }}>
                {statsLoading 
                  ? "Loading your workspace..." 
                  : stats.totalProjects > 0
                    ? `Your workspace is active with ${stats.totalProjects} projects.`
                    : "Your organization is ready. Now create your first project."}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                {perms.canCreateProject ? (
                  <button 
                    onClick={() => navigate('/projects')}
                    className="orbit-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg shadow-indigo-500/25"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {stats.totalProjects > 0 ? 'add_box' : 'create_new_folder'}
                    </span>
                    {stats.totalProjects > 0 ? 'New Project' : 'Create First Project'}
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/projects')}
                    className="orbit-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg shadow-indigo-500/25"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      folder
                    </span>
                    View Projects
                  </button>
                )}
                {perms.canInviteMembers ? (
                  <button 
                    onClick={() => navigate('/members')}
                    className="px-6 py-3 rounded-lg font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[rgba(255,255,255,0.1)] bg-white/80 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.08)] hover:border-slate-300 dark:hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Invite Members
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/tasks')}
                    className="px-6 py-3 rounded-lg font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[rgba(255,255,255,0.1)] bg-white/80 dark:bg-[rgba(255,255,255,0.04)] backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.08)] hover:border-slate-300 dark:hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    View Tasks
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* STATS GRID */}
        <motion.section 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${!hasOrg ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {[
            {
              label: 'Active Initiatives',
              value: stats.totalProjects || 0,
              icon: 'folder',
              color: '#6366f1',
              bg: 'rgba(99,102,241,0.1)',
              onClick: () => navigate('/projects'),
              tooltip: 'View all projects',
            },
            {
              label: 'Open Deliverables',
              value: stats.activeTasks || 0,
              icon: 'checklist',
              color: '#10b981',
              bg: 'rgba(16,185,129,0.1)',
              onClick: () => navigate('/tasks'),
              tooltip: 'View your tasks',
            },
            {
              label: 'Collaborators',
              value: stats.teamMembers || 0,
              icon: 'group',
              color: '#f59e0b',
              bg: 'rgba(245,158,11,0.1)',
              onClick: () => navigate('/members'),
              tooltip: 'Manage team members',
            },
            {
              label: 'Completion Rate',
              value: stats.productivity || '0%',
              icon: 'bolt',
              color: '#ec4899',
              bg: 'rgba(236,72,153,0.1)',
              onClick: () => navigate('/analytics'),
              tooltip: 'View productivity analytics',
            },
          ].map((card, i) => (
            <motion.button
              className="orbit-stat-card"
              variants={scaleIn}
              key={i}
              type="button"
              onClick={card.onClick}
              title={card.tooltip}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '16px',
                borderRadius: '12px',
                background: isDark ? '#161616' : 'white',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
                textAlign: 'left',
              }}
            >
              {statsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-white/5 rounded" />
                    <div className="size-5 bg-slate-200 dark:bg-white/5 rounded" />
                  </div>
                  <div className="h-8 w-12 bg-slate-200 dark:bg-white/5 rounded" />
                  <div className="h-3 w-24 bg-slate-200 dark:bg-white/5 rounded" />
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      width: '36px', height: '36px',
                      borderRadius: '10px',
                      background: card.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '20px', color: card.color }}>
                        {card.icon}
                      </span>
                    </div>
                    {/* Arrow indicating clickable */}
                    <span className="material-symbols-outlined"
                      style={{ fontSize: '16px', color: isDark ? '#334155' : '#cbd5e1' }}>
                      arrow_forward
                    </span>
                  </div>
                  <p style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    lineHeight: 1,
                    marginBottom: '4px',
                  }}>
                    <StatNumber value={card.value} />
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: isDark ? '#475569' : '#94a3b8',
                    fontWeight: 500,
                  }}>
                    {card.label}
                  </p>
                </>
              )}
            </motion.button>
          ))}
        </motion.section>

        {/* BOTTOM GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}>
          {/* Getting Started */}
          <div className="orbit-card col-span-1 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
              <h2
                className="orbit-section-title"
                style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                Workspace Setup
              </h2>
              <p style={{
                fontSize: '12px',
                color: isDark ? '#64748b' : '#94a3b8',
              }}>
                Complete steps to set up your workspace.
              </p>
            </div>
            <div className="p-5 space-y-4 flex-1">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`shrink-0 mt-0.5 size-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.done 
                      ? 'bg-indigo-600 border-indigo-600' 
                      : item.locked 
                        ? 'border-slate-200 dark:border-[rgba(255,255,255,0.08)] opacity-40' 
                        : 'border-slate-300 dark:border-[rgba(255,255,255,0.2)]'
                  }`}>
                    {item.done ? (
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    ) : item.locked ? (
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[12px]">lock</span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${
                      item.done 
                        ? 'line-through text-slate-400 dark:text-slate-600' 
                        : item.locked 
                          ? 'text-slate-400 dark:text-slate-600 opacity-50' 
                          : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                    {item.isCurrentStep && (
                      item.id === 1 ||
                      item.id === 2 ||
                      (item.id === 3 && perms.canCreateProject) ||
                      (item.id === 4 && perms.canInviteMembers)
                    ) && (
                      <button 
                        onClick={() => {
                          if (item.id === 2) setShowOrgModal(true)
                          if (item.id === 3) navigate('/projects')
                          if (item.id === 4) navigate('/members')
                        }}
                        className="text-xs font-bold text-indigo-500 mt-1 hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        → Start here
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 mt-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">{completedCount} of 4 completed</span>
                <span className="text-xs font-bold text-indigo-500">{progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="orbit-card col-span-2 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex justify-between items-center">
              <h2
                className="orbit-section-title"
                style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                Recent Activity Log
              </h2>
              {recentActivity.length > 4 && (
                <button
                  onClick={() => navigate('/activity')}
                  className="text-xs font-semibold text-indigo-500 hover:underline"
                >
                  View all →
                </button>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 opacity-60">
                  <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-700">history</span>
                  <p className="text-sm text-slate-400 dark:text-slate-600">No activity yet. Create a project to get started.</p>
                </div>
              ) : (
                <div className="space-y-5 flex-1">
                  {recentActivity.slice(0, 4).map(activity => {
                    const name = activity.user?.name || 'Someone'
                    const avatar = activity.user?.avatar
                    const initial = name.charAt(0).toUpperCase()
                    return (
                      <div key={activity._id} className="flex gap-3 items-start">
                        <div className="size-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30">
                          {avatar
                            ? <img src={avatar} className="w-full h-full object-cover" alt={name} />
                            : <span className="text-indigo-600 text-sm font-bold">{initial}</span>
                          }
                        </div>
                        <div className="flex-1 text-sm">
                          <p>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{name}</span>
                             <span className="text-slate-500 dark:text-slate-400">{' '}{formatAction(activity.action)}</span>
                            {activity.project?.name && (
                              <span className="text-slate-400 dark:text-slate-600 block text-[11px] mt-0.5">
                                in {activity.project.name}
                              </span>
                            )}
                          </p>
                          <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">{timeAgo(activity.createdAt)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PLAN BANNER */}
      {confirmModal && (
        <ConfirmModal
          isDark={isDark}
          {...confirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
    </>
  )
}

export default DashboardPage;
