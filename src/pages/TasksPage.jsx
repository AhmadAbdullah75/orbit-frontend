import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'

export default function TasksPage() {
  const navigate = useNavigate()
  const { user, activeOrgId } = useSelector(s => s.auth)
  const { isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [toast, setToast] = useState(null)

  // Filters state
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('me') // 'all' or 'me'

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const fetchAllTasks = async () => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.get(
        `/organizations/${activeOrgId}/all-tasks`
      )
      const data = res.data?.data || {}
      const tasks = data.tasks || []
      setAllTasks(tasks)
      const projectMap = new Map()
      tasks.forEach(t => {
        if (t.projectId && !projectMap.has(t.projectId)) {
          projectMap.set(t.projectId, {
            _id: t.projectId,
            name: t.projectName,
            color: t.projectColor,
          })
        }
      })
      setProjects(Array.from(projectMap.values()))
    } catch (err) {
      console.error('Tasks fetch error:', err)
      setAllTasks([])
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Early exit — no org, no infinite loading
  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    fetchAllTasks()
  }, [activeOrgId])

  // Helpers
  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'urgent': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Urgent' }
      case 'high': return { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', label: 'High' }
      case 'medium': return { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308', label: 'Medium' }
      case 'low': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: 'Low' }
      default: return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', label: 'Medium' }
    }
  }

  const getStatusLabel = (colName) => {
    if (!colName) return 'To Do'
    const name = colName.toLowerCase()
    if (name.includes('todo') || name.includes('to do')) return 'To Do'
    if (name.includes('progress') || name.includes('doing')) return 'In Progress'
    if (name.includes('review')) return 'Review'
    if (name.includes('done') || name.includes('complete')) return 'Completed'
    return colName
  }

  const getStatusColor = (colName) => {
    const label = getStatusLabel(colName)
    switch (label) {
      case 'Completed': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' }
      case 'In Progress': return { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1' }
      case 'Review': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' }
      default: return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isOverdue = (dateString, column) => {
    if (!dateString) return false
    const label = getStatusLabel(column?.name)
    if (label === 'Completed') return false
    return new Date(dateString) < new Date()
  }

  // Filter logic
  const filteredTasks = allTasks.filter(t => {
    // "Assigned to Me" filter
    if (assignedFilter === 'me') {
      const isAssigned =
        (t.assignees || []).some(
          a => (a._id || a) === user?._id
        )
      if (!isAssigned) return false
    }

    // Priority filter
    if (filterPriority !== 'all' &&
        t.priority !== filterPriority) {
      return false
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'done' && !t.isDone)
        return false
      if (filterStatus === 'open' && t.isDone)
        return false
    }

    // Search
    const q = search.toLowerCase().trim()
    if (q && !t.title?.toLowerCase().includes(q)) {
      return false
    }

    // Project filter
    if (selectedProject !== 'all' && t.projectId !== selectedProject) {
      return false
    }

    return true
  })

  const myTasks = allTasks.filter(t =>
    (t.assignees || []).some(
      a => (a._id || a) === user?._id
    )
  )
  const urgentHigh = allTasks.filter(t =>
    ['urgent', 'high'].includes(t.priority)
    && !t.isDone
  )
  const completed = allTasks.filter(t => t.isDone)

  // Summary counts
  const totalTasksCount = allTasks.length
  const myTasksCount = myTasks.length
  const urgentCount = urgentHigh.length
  const completedCount = completed.length

  if (!activeOrgId && !loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', textAlign: 'center',
        padding: '40px',
      }}>
        <span className="material-symbols-outlined"
          style={{
            fontSize: '56px',
            color: isDark ? '#1e293b' : '#e2e8f0',
            marginBottom: '16px', display: 'block',
          }}>
          task_alt
        </span>
        <p style={{
          fontSize: '18px', fontWeight: 700,
          color: isDark ? '#334155' : '#94a3b8',
        }}>
          No organization yet
        </p>
        <p style={{
          color: isDark ? '#1e293b' : '#cbd5e1',
          marginTop: '8px', fontSize: '14px',
        }}>
          Create an organization to view tasks
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 pt-6 px-4 sm:px-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workspace Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage, filter, and track all deliverables across your active organization projects.
          </p>
        </div>
        
        {/* Toggle Assignee Filter */}
        <div className="flex bg-slate-100 dark:bg-[rgba(255,255,255,0.04)] p-1 rounded-xl border border-slate-200/60 dark:border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setAssignedFilter('me')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              assignedFilter === 'me'
                ? 'bg-white dark:bg-[#1f1f1f] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Assigned to Me ({myTasksCount})
          </button>
          <button
            onClick={() => setAssignedFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              assignedFilter === 'all'
                ? 'bg-white dark:bg-[#1f1f1f] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Tasks ({allTasks.length})
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'All Tasks', value: totalTasksCount, icon: 'task', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'My Tasks', value: myTasksCount, icon: 'assignment_ind', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Urgent & High', value: urgentCount, icon: 'warning', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Completed', value: completedCount, icon: 'task_alt', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: isDark ? '#161616' : 'white',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
              transition: 'all 150ms ease',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '8px',
                  background: card.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: card.color }}>
                  {card.icon}
                </span>
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-0.5">
              {card.value}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {card.label}
            </p>
          </div>
        ))}
      </section>

      {/* FILTER PANEL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101010] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Search text</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Project dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Priority dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </div>

      {/* TASKS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading tasks from workspace...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
            <div className="size-16 rounded-full bg-slate-50 dark:bg-[#111] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-700">task_alt</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">No tasks found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              We couldn't find any tasks matching your filters. Try adjusting your query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredTasks.map((task) => {
              const prioInfo = getPriorityColor(task.priority)
              const statusInfo = getStatusColor(task.column?.name)
              const overdue = isOverdue(task.dueDate, task.column)
              
              return (
                <div
                  key={task._id}
                  onClick={() => navigate(`/org/${activeOrgId}/projects/${task.projectId}/board`)}
                  className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Project & Tag row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: task.projectColor }}
                      >
                        {task.projectName}
                      </span>
                      
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-extrabold"
                        style={{ backgroundColor: prioInfo.bg, color: prioInfo.text }}
                      >
                        {prioInfo.label}
                      </span>

                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-extrabold"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                      >
                        {getStatusLabel(task.column?.name)}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                      {task.title}
                    </h3>

                    {/* Task description snippet */}
                    {task.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Right side info (due date, assignees, actions) */}
                  <div className="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
                    {/* Due Date */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ color: overdue ? '#ef4444' : '#94a3b8' }}
                      >
                        calendar_today
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: overdue ? '#ef4444' : isDark ? '#94a3b8' : '#64748b' }}
                      >
                        {formatDate(task.dueDate)}
                        {overdue && <span className="ml-1 text-[10px] font-bold uppercase">(Overdue)</span>}
                      </span>
                    </div>

                    {/* Assignees */}
                    <div className="flex -space-x-2 overflow-hidden shrink-0">
                      {task.assignees && task.assignees.length > 0 ? (
                        task.assignees.map((assignee) => (
                          <div
                            key={assignee._id}
                            className="inline-block size-7 rounded-full border-2 border-white dark:border-[#161616] bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                            title={assignee.name}
                          >
                            {assignee.avatar ? (
                               <img src={assignee.avatar} className="size-full object-cover" alt="" />
                            ) : (
                              (assignee.name?.charAt(0) || '?').toUpperCase()
                            )}
                          </div>
                        ))
                      ) : (
                        <div
                          className="inline-block size-7 rounded-full border-2 border-white dark:border-[#161616] bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-400"
                          title="Unassigned"
                        >
                          —
                        </div>
                      )}
                    </div>

                    {/* Arrow indicator */}
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors hidden md:block">
                      arrow_forward
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
