import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'
import EmptyOrg from '../components/EmptyOrg'
import useAutoRefresh from '../hooks/useAutoRefresh'

function FilterPanel({
  isDark, search, setSearch,
  selectedProject, setSelectedProject,
  filterPriority, setFilterPriority,
  filterStatus, setFilterStatus,
  projects,
}) {
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined'
      ? window.innerWidth >= 768
      : true
  )

  const inputStyle = {
    padding: '9px 14px',
    borderRadius: '10px',
    border: `1px solid ${isDark
      ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
    background: isDark ? '#1e293b' : '#f8fafc',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '16px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        className="mobile-filter-toggle"
        style={{
          display: 'none',
          alignItems: 'center', gap: '6px',
          padding: '8px 14px',
          borderRadius: '10px',
          border: `1px solid ${isDark
            ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          background: isDark
            ? 'rgba(255,255,255,0.04)' : '#f8fafc',
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: '13px', fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
          marginBottom: open ? '8px' : '0',
        }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: '16px' }}>
          tune
        </span>
        {open ? 'Hide Filters' : 'Show Filters'}
      </button>

      {open && (
        <div className="p-4 sm:p-5 rounded-2xl"
          style={{
            background: isDark ? '#101010' : 'white',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.1)'}`,
          }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '8px',
          }}>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined"
                style={{
                  position: 'absolute', left: '10px', top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: isDark ? '#475569' : '#94a3b8',
                  pointerEvents: 'none',
                }}>
                search
              </span>
              <input
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '34px' }}
              />
            </div>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              style={inputStyle}>
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              style={inputStyle}>
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={inputStyle}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

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

          {/* QUICK STATS CARDS — 2-col mobile, 4-col desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}>
            {[
              { icon: 'assignment', label: 'All Tasks',
                value: allTasks.length, color: '#6366f1' },
              { icon: 'person', label: 'My Tasks',
                value: myTasks.length, color: '#10b981' },
              { icon: 'warning', label: 'Urgent & High',
                value: urgentHigh.length, color: '#ef4444' },
              { icon: 'task_alt', label: 'Completed',
                value: completed.length, color: '#f59e0b' },
            ].map((s, i) => (
              <div
                key={i}
                className="orbit-stat-card"
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: isDark ? '#111' : 'white',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(99,102,241,0.1)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: `${s.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: s.color }}>
                    {s.icon}
                  </span>
                </div>
                <div>
                  <p style={{
                    fontSize: '24px', fontWeight: 800,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    margin: 0, lineHeight: 1,
                  }}>
                    {s.value}
                  </p>
                  <p style={{
                    fontSize: '11px', fontWeight: 500,
                    color: isDark ? '#475569' : '#94a3b8',
                    margin: '3px 0 0',
                  }}>
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* FILTER PANEL — collapsible on mobile */}
          <FilterPanel
            isDark={isDark}
            search={search}
            setSearch={setSearch}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            projects={projects}
          />

          {/* TASKS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  We couldn't find any tasks matching your filters.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const prioInfo = getPriorityColor(task.priority)
                const overdue = isOverdue(task.dueDate, task.column)
                return (
                  <div
                    key={task._id}
                    className="orbit-card orbit-task-list-item"
                    onClick={() => openTaskDetail(task)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isDark ? '#111' : 'white',
                      border: `1px solid ${isDark
                        ? 'rgba(255,255,255,0.06)' : '#e8e6ff'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}>
                    {/* Priority bar */}
                    <div style={{
                      width: '4px', height: '44px',
                      borderRadius: '2px', flexShrink: 0,
                      marginTop: '2px',
                      background:
                        task.priority === 'urgent' ? '#ef4444'
                        : task.priority === 'high' ? '#f97316'
                        : task.priority === 'low' ? '#94a3b8'
                        : '#eab308',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '14px', fontWeight: 600,
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        margin: '0 0 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </p>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap', gap: '6px',
                        alignItems: 'center',
                      }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center', gap: '4px',
                          fontSize: '11px',
                          color: isDark ? '#475569' : '#94a3b8',
                        }}>
                          <div style={{
                            width: '6px', height: '6px',
                            borderRadius: '50%',
                            background: task.projectColor || '#6366f1',
                          }} />
                          {task.projectName}
                        </span>
                        {task.dueDate && (
                          <span style={{
                            fontSize: '11px',
                            color: overdue ? '#ef4444' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center', gap: '3px',
                          }}>
                            <span className="material-symbols-outlined"
                              style={{ fontSize: '12px' }}>
                              schedule
                            </span>
                            {new Date(task.dueDate)
                              .toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                              })}
                            {overdue && ' (OVERDUE)'}
                          </span>
                        )}
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: prioInfo.bg,
                          color: prioInfo.text,
                        }}>
                          {prioInfo.label}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined"
                      style={{
                        fontSize: '16px',
                        color: isDark ? '#334155' : '#cbd5e1',
                        flexShrink: 0, marginTop: '2px',
                      }}>
                      chevron_right
                    </span>
                  </div>
                )
              })
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
