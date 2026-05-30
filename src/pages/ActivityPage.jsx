import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { useSelector } from 'react-redux'
import { useTheme } from '../context/ThemeContext'
import api from '../services/axios'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, slideUp } from '../utils/animations'
import { useLocation, useNavigate } from 'react-router-dom'
import EmptyOrg from '../components/EmptyOrg'
import useAutoRefresh from '../hooks/useAutoRefresh'

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
    { month: 'short', day: 'numeric', year: 'numeric' })
}

const ENTITY_ICONS = {
  project: 'folder',
  task: 'checklist',
  member: 'group',
  comment: 'chat',
  column: 'view_column',
}

const ENTITY_LABELS = {
  project: 'Project',
  task: 'Task',
  member: 'Member',
  comment: 'Comment',
  column: 'Board Column',
}


const ActivityPage = () => {
  const { user, activeOrgId } = useSelector(s => s.auth)
  const { isDark } = useTheme()
  const navigate = useNavigate()

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
  const orgId = activeOrgId

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmModal, setConfirmModal] = useState(null)
  const loaderRef = useRef(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  const location = useLocation()

  useEffect(() => {
    // If navigated from dashboard with filter
    if (location.state?.entityFilter) {
      setEntityFilter(location.state.entityFilter)
    }
  }, [location.state])

  const fetchActivity = useCallback(async (pageNum = 1) => {
    if (!orgId) return
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      const res = await api.get(
        `/organizations/${orgId}/activity?page=${pageNum}&limit=20&entity=${entityFilter}&action=${search}`
      )
      const data = res.data?.data?.activities || []
      const pagination = res.data?.data?.pagination || {}
      
      if (pageNum === 1) {
        setActivities(data)
      } else {
        setActivities(prev => {
          const existingIds = new Set(prev.map(a => a._id))
          const newUniqueData = data.filter(a => !existingIds.has(a._id))
          return [...prev, ...newUniqueData]
        })
      }
      
      setTotalPages(pagination.pages || 1)
      setTotal(pagination.total || 0)
    } catch (err) {
      console.error('Activity fetch error:', err)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [orgId, entityFilter, search])

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || page >= totalPages) return;
    
    setLoadingMore(true);
    setPage(prev => {
      const next = prev + 1;
      fetchActivity(next);
      return next;
    });
  }, [loading, loadingMore, page, totalPages, fetchActivity]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    const delay = setTimeout(() => {
      setPage(1)
      fetchActivity(1)
    }, 300)
    return () => clearTimeout(delay)
  }, [activeOrgId, fetchActivity])

  useAutoRefresh(
    () => {
      if (activeOrgId) {
        setPage(1)
        setActivities([])
        fetchActivity(1)
      }
    },
    60000,
    [activeOrgId]
  )

  const loadMore = () => {
    handleLoadMore();
  }

  if (!activeOrgId && !loading) {
    return (
      <EmptyOrg
        icon="timeline"
        title="No Organization Yet"
        description="Create an organization to track activity and audit logs."
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="orbit-page-title">Activity Log</h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Real-time trail of events across your organization.
          </p>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[rgba(255,255,255,0.06)]">
          {total} EVENTS
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border-none bg-slate-100 dark:bg-[rgba(255,255,255,0.06)] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-[#161616] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
        >
          <option value="all">All Entities</option>
          <option value="project">Projects</option>
          <option value="task">Tasks</option>
          <option value="member">Members</option>
          <option value="comment">Comments</option>
          <option value="column">Board Columns</option>
        </select>
      </div>

      {/* Activity list */}
      {loading && activities.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="size-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-700">history</span>
          <p className="text-slate-500 dark:text-slate-400">No activity yet</p>
        </div>
      ) : (
        <motion.div 
          className="space-y-1"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {activities.map((activity, index) => {
            const name = activity.user?.name || 'System'
            const avatar = activity.user?.avatar
            const initial = name.charAt(0).toUpperCase()
            const icon = ENTITY_ICONS[activity.entity] || 'info'

            const actDate = new Date(activity.createdAt).toDateString()
            const prevDate = index > 0
              ? new Date(activities[index - 1].createdAt).toDateString()
              : null
            const showDate = actDate !== prevDate

            return (
              <motion.div variants={slideUp} key={activity._id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-3 my-2">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-[rgba(255,255,255,0.06)]" />
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-600">
                      {new Date(activity.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-[rgba(255,255,255,0.06)]" />
                  </div>
                )}

                <div className="flex gap-3 items-start px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                  <div className="size-8 rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30">
                    {avatar
                      ? <img src={avatar} className="w-full h-full object-cover" alt={name} />
                      : <span className="text-indigo-600 text-sm font-bold">{initial}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{name}</span>
                      <span className="text-slate-600 dark:text-slate-400">{' '}{formatAction(activity.action)}</span>
                      {activity.project?.name && (
                        <span className="text-slate-400 dark:text-slate-600 block text-[12px] mt-0.5 font-medium">
                          in {activity.project.name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">{timeAgo(activity.createdAt)}</p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-600">
                    {icon}
                  </span>
                </div>
              </motion.div>
            )
          })}

          <div ref={loaderRef}
               className="flex justify-center py-6">
            {loadingMore && (
              <div className="flex items-center gap-2
                              text-sm text-slate-400">
                <div className="size-4 rounded-full border-2
                  border-indigo-500 border-t-transparent
                  animate-spin" />
                Loading more...
              </div>
            )}
            {!loadingMore && page >= totalPages
              && activities.length > 0 && (
              <p className={`text-xs
                ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
                You've seen all activity
              </p>
            )}
          </div>
        </motion.div>
      )}
      {confirmModal && (
        <ConfirmModal
          isDark={isDark}
          {...confirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}

export default ActivityPage
