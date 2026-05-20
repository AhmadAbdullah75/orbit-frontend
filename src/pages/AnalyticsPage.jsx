import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import Toast from '../components/Toast'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { activeOrgId } = useSelector(s => s.auth)

  const [loading, setLoading] = useState(true)
  const [projectsData, setProjectsData] = useState([])
  const [members, setMembers] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const fetchAnalytics = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      // 1. Fetch organization members
      const membersRes = await api.get(`/organizations/${activeOrgId}/members`)
      const orgMembers = membersRes.data?.data?.members || []
      setMembers(orgMembers)

      // 2. Fetch all projects in organization
      const projectsRes = await api.get(`/organizations/${activeOrgId}/projects`)
      const fetchedProjects = projectsRes.data?.data?.projects || []

      // 3. For each project, fetch its board and tasks in parallel
      const detailedProjects = []
      await Promise.all(
        fetchedProjects.map(async (project) => {
          try {
            const projDetailRes = await api.get(`/projects/${project._id}`)
            const board = projDetailRes.data?.data?.project?.board
            if (board?._id) {
              const tasksRes = await api.get(`/tasks?boardId=${board._id}`)
              const tasks = tasksRes.data?.data?.tasks || []
              
              // Calculate task statuses
              let total = tasks.length
              let done = 0
              let urgent = 0
              let high = 0
              let medium = 0
              let low = 0

              tasks.forEach(task => {
                // Done check
                const colName = task.column?.name?.toLowerCase() || ''
                if (colName.includes('done') || colName.includes('complete')) {
                  done++
                }

                // Priority check
                if (task.priority === 'urgent') urgent++
                else if (task.priority === 'high') high++
                else if (task.priority === 'medium') medium++
                else if (task.priority === 'low') low++
              })

              const rate = total > 0 ? Math.round((done / total) * 100) : 0

              detailedProjects.push({
                ...project,
                tasks,
                stats: {
                  total,
                  done,
                  active: total - done,
                  productivity: rate,
                  priorityDistribution: { urgent, high, medium, low }
                }
              })
            } else {
              detailedProjects.push({
                ...project,
                tasks: [],
                stats: { total: 0, done: 0, active: 0, productivity: 0, priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 } }
              })
            }
          } catch (err) {
            console.error(`Error loading analytics for project ${project.name}:`, err)
            detailedProjects.push({
              ...project,
              tasks: [],
              stats: { total: 0, done: 0, active: 0, productivity: 0, priorityDistribution: { urgent: 0, high: 0, medium: 0, low: 0 } }
            })
          }
        })
      )

      // Sort by project name
      detailedProjects.sort((a, b) => a.name.localeCompare(b.name))
      setProjectsData(detailedProjects)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      showToast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, showToast])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Aggregate stats
  const totalTasks = projectsData.reduce((sum, p) => sum + p.stats.total, 0)
  const completedTasks = projectsData.reduce((sum, p) => sum + p.stats.done, 0)
  const activeTasks = totalTasks - completedTasks
  const overallProductivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Priority Distribution
  const urgentCount = projectsData.reduce((sum, p) => sum + p.stats.priorityDistribution.urgent, 0)
  const highCount = projectsData.reduce((sum, p) => sum + p.stats.priorityDistribution.high, 0)
  const mediumCount = projectsData.reduce((sum, p) => sum + p.stats.priorityDistribution.medium, 0)
  const lowCount = projectsData.reduce((sum, p) => sum + p.stats.priorityDistribution.low, 0)

  // Member tasks counts
  const membersAnalytics = members.map(m => {
    let assigned = 0
    let done = 0

    projectsData.forEach(p => {
      p.tasks.forEach(t => {
        const isAssigned = t.assignees?.some(a => a._id === m._id)
        if (isAssigned) {
          assigned++
          const colName = t.column?.name?.toLowerCase() || ''
          if (colName.includes('done') || colName.includes('complete')) {
            done++
          }
        }
      })
    })

    return {
      ...m,
      assigned,
      done,
      active: assigned - done,
      rate: assigned > 0 ? Math.round((done / assigned) * 100) : 0
    }
  })

  // Sort members by performance or tasks assigned
  membersAnalytics.sort((a, b) => b.assigned - a.assigned)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 pt-6 px-4 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workspace Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time insight into project completion rates, priority distribution, and contributor performance.
          </p>
        </div>
        
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-xl hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.06)] transition-all"
        >
          <span className="material-symbols-outlined text-[16px] animate-spin-hover">refresh</span>
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Analyzing workspace metrics...</p>
        </div>
      ) : projectsData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
          <div className="size-16 rounded-full bg-slate-50 dark:bg-[#111] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-700">analytics</span>
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">No analytics available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Please create projects and tasks in your organization workspace to view analytical logs.
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS AND CHART */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Circular Progress Gauge */}
            <div className="col-span-1 p-6 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] flex flex-col items-center justify-center text-center shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">Overall Completion Rate</h3>
              
              <div className="relative size-36 flex items-center justify-center">
                {/* SVG Circular progress */}
                <svg className="size-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="stroke-slate-100 dark:stroke-[rgba(255,255,255,0.03)]"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="stroke-indigo-600 dark:stroke-indigo-500"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - overallProductivity / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-800 dark:text-white">{overallProductivity}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Productivity</span>
                </div>
              </div>

              <div className="flex gap-6 mt-6">
                <div className="text-center">
                  <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{completedTasks}</p>
                  <p className="text-[10px] font-semibold text-slate-400">Completed</p>
                </div>
                <div className="w-px h-8 bg-slate-100 dark:bg-[rgba(255,255,255,0.06)]" />
                <div className="text-center">
                  <p className="text-lg font-extrabold text-slate-700 dark:text-slate-300">{activeTasks}</p>
                  <p className="text-[10px] font-semibold text-slate-400">Active</p>
                </div>
                <div className="w-px h-8 bg-slate-100 dark:bg-[rgba(255,255,255,0.06)]" />
                <div className="text-center">
                  <p className="text-lg font-extrabold text-slate-500">{totalTasks}</p>
                  <p className="text-[10px] font-semibold text-slate-400">Total</p>
                </div>
              </div>
            </div>

            {/* Task Priority Distribution */}
            <div className="col-span-1 md:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Priority Distribution</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Task volume segmented by urgency tags.</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Urgent', count: urgentCount, color: '#ef4444', pct: totalTasks > 0 ? (urgentCount / totalTasks) * 100 : 0 },
                  { label: 'High', count: highCount, color: '#f97316', pct: totalTasks > 0 ? (highCount / totalTasks) * 100 : 0 },
                  { label: 'Medium', count: mediumCount, color: '#eab308', pct: totalTasks > 0 ? (mediumCount / totalTasks) * 100 : 0 },
                  { label: 'Low', count: lowCount, color: '#3b82f6', pct: totalTasks > 0 ? (lowCount / totalTasks) * 100 : 0 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="text-slate-800 dark:text-slate-200">{item.count} tasks ({Math.round(item.pct)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-50 dark:bg-[rgba(255,255,255,0.02)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ backgroundColor: item.color, width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PROJECT METRICS */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Project Performance</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Deliverable status metrics for each project workspace.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectsData.map((project) => (
                <div
                  key={project._id}
                  onClick={() => navigate(`/org/${activeOrgId}/projects/${project._id}/board`)}
                  className="group p-4 rounded-xl border border-slate-100 dark:border-[rgba(255,255,255,0.04)] hover:border-indigo-500/30 bg-slate-50/50 dark:bg-[#101010]/30 hover:bg-white dark:hover:bg-[#1c1c1c] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="size-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || '#6366f1' }}
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {project.name}
                      </span>
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {project.stats.productivity}% Done
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: project.color || '#6366f1',
                          width: `${project.stats.productivity}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      <span>{project.stats.total} Total Tasks</span>
                      <div className="flex gap-2">
                        <span className="text-emerald-500">{project.stats.done} Done</span>
                        <span>•</span>
                        <span className="text-indigo-500">{project.stats.active} Open</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM MEMBERS CONTRIBUTION */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#161616] border border-slate-200/80 dark:border-[rgba(255,255,255,0.07)] shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Contributor Output</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Assigned work counts and completion logs for organization members.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Team Member</th>
                    <th className="pb-3 font-semibold text-center">Assigned Tasks</th>
                    <th className="pb-3 font-semibold text-center">Completed</th>
                    <th className="pb-3 font-semibold text-center">Active</th>
                    <th className="pb-3 font-semibold text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 dark:divide-[rgba(255,255,255,0.03)] text-sm">
                  {membersAnalytics.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/50 dark:hover:bg-white/1 transition-colors">
                      <td className="py-3.5 flex items-center gap-3">
                        <div className="size-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} className="size-full object-cover" alt="" />
                          ) : (
                            (member.name?.charAt(0) || '?').toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {member.assigned}
                      </td>
                      <td className="py-3.5 text-center font-bold text-emerald-500">
                        {member.done}
                      </td>
                      <td className="py-3.5 text-center font-bold text-indigo-500">
                        {member.active}
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-800 dark:text-slate-100">
                        {member.assigned > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <span>{member.rate}%</span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${member.rate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
