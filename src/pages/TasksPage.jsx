import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'
import EmptyOrg from '../components/EmptyOrg'
import useAutoRefresh from '../hooks/useAutoRefresh'

export default function TasksPage() {
  const navigate = useNavigate()
  const { user, activeOrgId } = useSelector(s => s.auth)
  const { isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [toast, setToast] = useState(null)

  const [selectedTask, setSelectedTask] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [taskComments, setTaskComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

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

  useAutoRefresh(
    () => { if (activeOrgId) fetchAllTasks() },
    60000,
    [activeOrgId]
  )

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

  const openTaskDetail = async (task) => {
    setSelectedTask(task)
    setTaskComments([])
    try {
      setLoadingDetail(true)
      const res = await api.get(
        `/tasks/${task._id}/comments`
      )
      setTaskComments(
        res.data?.data?.comments || []
      )
    } catch (err) {
      console.error('Comments fetch error:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeTaskDetail = () => {
    setSelectedTask(null)
    setTaskComments([])
    setNewComment('')
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const res = await api.post(
        `/tasks/${selectedTask._id}/comments`,
        { content: newComment.trim() }
      )
      const comment = res.data?.data?.comment
      if (comment) {
        setTaskComments(prev => [...prev, comment])
      }
      setNewComment('')
    } catch (err) {
      console.error('Post comment error:', err)
    } finally {
      setPostingComment(false)
    }
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
      <EmptyOrg
        icon="checklist"
        title="No Organization Yet"
        description="Create an organization to see tasks across all your projects."
      />
    )
  }

  return (
    <div style={{
      maxWidth: selectedTask ? '100%' : '900px',
      margin: '0 auto',
      padding: selectedTask ? '0' : '32px 24px',
      transition: 'all 250ms ease',
    }}>
      {selectedTask ? (
        /* Split view: list + detail panel */
        <div style={{
          display: 'flex',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}>
          {/* LEFT — Task list */}
          <div style={{
            width: '40%',
            minWidth: '320px',
            padding: '24px',
            overflowY: 'auto',
            borderRight: `1px solid ${isDark
              ? 'rgba(255,255,255,0.06)'
              : '#e2e8f0'}`,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 700,
                color: isDark ? '#f1f5f9' : '#0f172a',
                margin: 0,
              }}>
                {filteredTasks.length} Tasks
              </h2>
            </div>

            {/* Task list — compact */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {filteredTasks.map(task => (
                <div
                  key={task._id}
                  onClick={() => openTaskDetail(task)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background:
                      selectedTask?._id === task._id
                        ? isDark
                          ? 'rgba(99,102,241,0.15)'
                          : 'rgba(99,102,241,0.08)'
                        : isDark ? '#111' : 'white',
                    border: `1px solid ${
                      selectedTask?._id === task._id
                        ? '#6366f1'
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : '#e2e8f0'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}>
                  {/* Priority indicator */}
                  <div style={{
                    width: '3px',
                    height: '36px',
                    borderRadius: '2px',
                    flexShrink: 0,
                    background:
                      task.priority === 'urgent'
                        ? '#ef4444'
                        : task.priority === 'high'
                          ? '#f97316'
                          : task.priority === 'low'
                            ? '#94a3b8'
                            : '#eab308',
                    marginTop: '2px',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: isDark
                        ? '#f1f5f9' : '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      margin: '0 0 2px',
                    }}>
                      {task.title}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <div style={{
                        width: '6px', height: '6px',
                        borderRadius: '50%',
                        background:
                          task.projectColor || '#6366f1',
                      }} />
                      <span style={{
                        fontSize: '11px',
                        color: isDark
                          ? '#475569' : '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {task.projectName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Task detail panel */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: isDark ? '#0a0a0a' : '#fafafa',
          }}>
            <TaskDetailPanel
              task={selectedTask}
              comments={taskComments}
              loading={loadingDetail}
              isDark={isDark}
              user={user}
              newComment={newComment}
              setNewComment={setNewComment}
              onPostComment={handlePostComment}
              postingComment={postingComment}
              onClose={closeTaskDetail}
              onNavigateToBoard={() => navigate(
                `/org/${activeOrgId}/projects/${selectedTask.projectId}/board`
              )}
            />
          </div>
        </div>
      ) : (
        /* Normal full-width list view */
        <>
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
                className="orbit-stat-card"
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isDark ? '#161616' : 'white',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
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
            <div className="tasks-filter-panel">
              <div className="tasks-filter-search flex flex-col">
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

              <div className="tasks-filter-selects">
                <div className="tasks-filter-select flex flex-col">
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

                <div className="tasks-filter-select flex flex-col">
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

                <div className="tasks-filter-select flex flex-col">
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
                      onClick={() => openTaskDetail(task)}
                      className="orbit-card group relative flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl shadow-sm"
                      style={{
                        background: selectedTask?._id === task._id
                          ? isDark
                            ? 'rgba(99,102,241,0.12)'
                            : 'rgba(99,102,241,0.06)'
                          : isDark ? '#161616' : 'white',
                        border: `1px solid ${
                          selectedTask?._id === task._id
                            ? 'rgba(99,102,241,0.3)'
                            : isDark
                              ? 'rgba(255,255,255,0.07)'
                              : '#e2e8f0'
                        }`,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
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
                          <div
                            className="task-description-preview"
                            dangerouslySetInnerHTML={{
                              __html: task.description
                                .replace(/<[^>]*>/g, '')
                                .substring(0, 80) +
                                (task.description.replace(
                                  /<[^>]*>/g, ''
                                ).length > 80 ? '...' : '')
                            }}
                            style={{
                              fontSize: '12px',
                              color: isDark ? '#475569' : '#94a3b8',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                              marginTop: '4px',
                            }}
                          />
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
        </>
      )}

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

function TaskDetailPanel({
  task, comments, loading, isDark,
  user, newComment, setNewComment,
  onPostComment, postingComment,
  onClose, onNavigateToBoard,
}) {
  const priorityConfig = {
    urgent: { color: '#ef4444', label: 'Urgent' },
    high: { color: '#f97316', label: 'High' },
    medium: { color: '#eab308', label: 'Medium' },
    low: { color: '#94a3b8', label: 'Low' },
  }
  const priority = priorityConfig[task.priority]
    || priorityConfig.medium

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px',
        gap: '12px',
      }}>
        <div style={{ flex: 1 }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
          }}>
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: task.projectColor || '#6366f1',
            }} />
            <span style={{
              fontSize: '12px',
              color: isDark ? '#475569' : '#94a3b8',
              fontWeight: 500,
            }}>
              {task.projectName}
            </span>
            <span style={{
              fontSize: '12px',
              color: isDark ? '#334155' : '#cbd5e1',
            }}>›</span>
            <span style={{
              fontSize: '12px',
              color: isDark ? '#475569' : '#94a3b8',
            }}>
              {task.column?.name || 'Board'}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '20px',
            fontWeight: 800,
            color: isDark ? '#f1f5f9' : '#0f172a',
            lineHeight: 1.3,
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {task.title}
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex', gap: '6px',
          flexShrink: 0,
        }}>
          <button
            onClick={onNavigateToBoard}
            title="Open in board"
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: `1px solid ${isDark
                ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
              background: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center', gap: '4px',
            }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px' }}>
              open_in_new
            </span>
            Board
          </button>
          <button
            onClick={onClose}
            title="Close panel"
            style={{
              width: '32px', height: '32px',
              borderRadius: '8px',
              border: `1px solid ${isDark
                ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
              background: 'transparent',
              color: isDark ? '#64748b' : '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      </div>

      {/* Meta tags row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: `1px solid ${isDark
          ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
      }}>
        {/* Priority */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center', gap: '5px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px', fontWeight: 600,
          background: `${priority.color}18`,
          color: priority.color,
          border: `1px solid ${priority.color}30`,
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '12px' }}>
            flag
          </span>
          {priority.label}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px', fontWeight: 600,
            background: new Date(task.dueDate) < new Date()
              ? 'rgba(239,68,68,0.1)'
              : isDark
                ? 'rgba(255,255,255,0.06)'
                : '#f1f5f9',
            color: new Date(task.dueDate) < new Date()
              ? '#ef4444'
              : isDark ? '#94a3b8' : '#64748b',
          }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '12px' }}>
              schedule
            </span>
            {new Date(task.dueDate)
              .toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
                year: 'numeric',
              })}
          </span>
        )}

        {/* Status/Column */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center', gap: '5px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px', fontWeight: 600,
          background: isDark
            ? 'rgba(99,102,241,0.1)'
            : 'rgba(99,102,241,0.06)',
          color: '#6366f1',
        }}>
          {task.column?.name || 'In Progress'}
        </span>

        {/* Labels */}
        {(task.labels || []).map((label, i) => (
          <span key={i} style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px', fontWeight: 600,
            background: isDark
              ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            color: isDark ? '#94a3b8' : '#64748b',
          }}>
            {label}
          </span>
        ))}
      </div>

      {/* Assignees */}
      {(task.assignees || []).length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#334155' : '#94a3b8',
            marginBottom: '10px',
          }}>
            Assignees
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '8px',
          }}>
            {task.assignees.map((a, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center', gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f8fafc',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#e2e8f0'}`,
              }}>
                <div style={{
                  width: '22px', height: '22px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  color: 'white',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {a.avatar
                    ? <img src={a.avatar}
                        style={{ width: '100%',
                                 height: '100%',
                                 objectFit: 'cover' }}
                        alt="" />
                    : (a.name || 'U').charAt(0)
                  }
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: 500,
                  color: isDark ? '#e2e8f0' : '#374151',
                }}>
                  {a.name || a.email || 'User'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#334155' : '#94a3b8',
            marginBottom: '10px',
          }}>
            Description
          </p>
          <div
            dangerouslySetInnerHTML={{
              __html: task.description
            }}
            className="task-rich-content"
            style={{
              fontSize: '14px',
              lineHeight: 1.7,
              color: isDark ? '#94a3b8' : '#64748b',
              background: isDark
                ? 'rgba(255,255,255,0.03)'
                : '#f8fafc',
              borderRadius: '10px',
              padding: '14px',
              border: `1px solid ${isDark
                ? 'rgba(255,255,255,0.06)'
                : '#e2e8f0'}`,
            }}
          />
        </div>
      )}

      {/* Subtasks */}
      {(task.subtasks || []).length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#334155' : '#94a3b8',
            marginBottom: '10px',
          }}>
            Subtasks ({
              task.subtasks.filter(s => s.completed)
                .length
            }/{task.subtasks.length})
          </p>
          {/* Progress bar */}
          <div style={{
            height: '4px', borderRadius: '2px',
            background: isDark
              ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            marginBottom: '10px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${task.subtasks.length > 0
                ? Math.round(
                    (task.subtasks.filter(
                      s => s.completed
                    ).length / task.subtasks.length)
                    * 100
                  )
                : 0}%`,
              background: '#10b981',
              borderRadius: '2px',
              transition: 'width 300ms ease',
            }} />
          </div>
          {task.subtasks.map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center', gap: '10px',
              padding: '7px 0',
              borderBottom: `1px solid ${isDark
                ? 'rgba(255,255,255,0.04)'
                : '#f8fafc'}`,
            }}>
              <div style={{
                width: '16px', height: '16px',
                borderRadius: '4px',
                border: `2px solid ${s.completed
                  ? '#10b981'
                  : isDark
                    ? 'rgba(255,255,255,0.2)'
                    : '#d1d5db'}`,
                background: s.completed
                  ? '#10b981' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {s.completed && (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '11px',
                             color: 'white' }}>
                    check
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '13px',
                color: s.completed
                  ? isDark ? '#334155' : '#94a3b8'
                  : isDark ? '#e2e8f0' : '#374151',
                textDecoration: s.completed
                  ? 'line-through' : 'none',
                opacity: s.completed ? 0.6 : 1,
              }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      <div>
        <p style={{
          fontSize: '11px', fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: isDark ? '#334155' : '#94a3b8',
          marginBottom: '14px',
        }}>
          Comments ({comments.length})
        </p>

        {loading && (
          <div style={{
            textAlign: 'center', padding: '20px',
          }}>
            <div style={{
              width: '20px', height: '20px',
              borderRadius: '50%',
              border: '2px solid #6366f1',
              borderTop: '2px solid transparent',
              animation:
                'orbit-spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <p style={{
            fontSize: '13px',
            color: isDark ? '#334155' : '#cbd5e1',
            fontStyle: 'italic',
            marginBottom: '16px',
            textAlign: 'center',
            padding: '12px',
          }}>
            No comments yet. Be the first!
          </p>
        )}

        {!loading && comments.map((c, i) => (
          <div key={i} style={{
            display: 'flex', gap: '10px',
            marginBottom: '14px',
          }}>
            <div style={{
              width: '30px', height: '30px',
              borderRadius: '50%',
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
              color: 'white', flexShrink: 0,
              overflow: 'hidden',
            }}>
              {c.user?.avatar
                ? <img src={c.user.avatar}
                    style={{ width: '100%',
                             height: '100%',
                             objectFit: 'cover' }} />
                : (c.user?.name || 'U').charAt(0)
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center', gap: '8px',
                marginBottom: '4px',
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: 600,
                  color: isDark ? '#f1f5f9' : '#1e293b',
                }}>
                  {c.user?.name || 'User'}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: isDark ? '#334155' : '#94a3b8',
                }}>
                  {new Date(c.createdAt)
                    .toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                </span>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: c.content || c.text || ''
                }}
                className="task-rich-content"
                style={{
                  fontSize: '13px', lineHeight: 1.6,
                  color: isDark ? '#94a3b8' : '#64748b',
                  background: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : '#f8fafc',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.06)'
                    : '#e2e8f0'}`,
                }}
              />
            </div>
          </div>
        ))}

        {/* Add comment */}
        <div style={{
          display: 'flex', gap: '10px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${isDark
            ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
        }}>
          <div style={{
            width: '30px', height: '30px',
            borderRadius: '50%',
            background: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
            color: 'white', flexShrink: 0,
          }}>
            {(user?.name || 'U').charAt(0)
              .toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={newComment}
              onChange={e =>
                setNewComment(e.target.value)
              }
              placeholder="Add a comment..."
              onKeyDown={e => {
                if (e.key === 'Enter' &&
                    (e.metaKey || e.ctrlKey)) {
                  onPostComment()
                }
              }}
              style={{
                width: '100%',
                minHeight: '72px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.1)'
                  : '#e2e8f0'}`,
                background: isDark
                  ? 'rgba(255,255,255,0.04)'
                  : '#f8fafc',
                color: isDark ? '#e2e8f0' : '#0f172a',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '6px',
            }}>
              <span style={{
                fontSize: '11px',
                color: isDark ? '#334155' : '#94a3b8',
              }}>
                Ctrl+Enter to post
              </span>
              <button
                onClick={onPostComment}
                disabled={
                  postingComment ||
                  !newComment.trim()
                }
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  background: newComment.trim()
                    ? '#6366f1' : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                  color: newComment.trim()
                    ? 'white'
                    : isDark ? '#475569' : '#94a3b8',
                  border: 'none',
                  fontSize: '12px', fontWeight: 600,
                  cursor: newComment.trim()
                    ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms',
                }}>
                {postingComment
                  ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
