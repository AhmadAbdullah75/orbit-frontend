import { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import EmptyOrg from '../components/EmptyOrg'
import useAutoRefresh from '../hooks/useAutoRefresh'
import { getPermissions } from '../utils/permissions'

const ProjectsPage = () => {
  const navigate = useNavigate()
  const { user, activeOrgId } = useSelector(s => s.auth)
  const { isDark } = useTheme()
  const orgId = activeOrgId
             || user?.organization?._id
             || (typeof user?.organization === 'string'
                 ? user.organization : null)

  const [projects, setProjects] = useState([])
  const [orgMembers, setOrgMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState('viewer')
  const perms = getPermissions(userRole)

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('projectsViewMode') || 'grid'
  })

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', color: '#6366f1', members: []
  })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [projectStats, setProjectStats] = useState({})
  const [localSearch, setLocalSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchDrop, setShowSearchDrop] = useState(false)
  const localSearchRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const COLORS = [
    '#6366f1','#10b981','#f59e0b',
    '#ef4444','#3b82f6','#8b5cf6'
  ]

  const fetchOrgMembers = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await api.get(`/organizations/${orgId}/members`)
      setOrgMembers(res.data?.data?.members || [])
    } catch (err) {
      console.error(err)
    }
  }, [orgId])

  useEffect(() => {
    if (orgId) {
      fetchProjects()
      fetchOrgMembers()
      
      // Fetch user role
      const fetchRole = async () => {
        try {
          const res = await api.get(`/organizations/${orgId}`)
          setUserRole(res.data?.data?.organization?.userRole || 'viewer')
        } catch (err) {
          console.error('Fetch role error:', err)
        }
      }
      fetchRole()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useAutoRefresh(
    () => { if (activeOrgId) fetchProjects() },
    90000,
    [activeOrgId]
  )

  // Click outside to close action menus and search dropdown
  useEffect(() => {
    const handler = (e) => {
      setOpenMenuId(null)
      if (localSearchRef.current && !localSearchRef.current.contains(e.target)) {
        setShowSearchDrop(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Local search logic
  useEffect(() => {
    if (!localSearch.trim()) {
      setSearchResults([])
      setShowSearchDrop(false)
      return
    }
    const q = localSearch.toLowerCase()
    const results = projects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
    setSearchResults(results)
    setShowSearchDrop(true)
  }, [localSearch, projects])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/organizations/${orgId}/projects`)
      const data = res.data?.data?.projects || []
      setProjects(Array.isArray(data) ? data : [])

      // Fetch stats for all projects in a single batch
      if (data.length > 0) {
        try {
          const statsRes = await api.get(`/organizations/${orgId}/projects/batch/stats`)
          setProjectStats(statsRes.data?.data || {})
        } catch (err) {
          console.error('Batch stats error:', err)
        }
      }
    } catch (err) {
      if (err.response?.status === 404) setProjects([])
      else setError(err.response?.data?.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('Project name is required')
      return
    }
    if (!orgId) {
      setFormError('No organization found')
      return
    }
    try {
      setCreating(true)
      setFormError('')
      const res = await api.post(
        `/organizations/${orgId}/projects`,
        {
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
          members: form.members
        }
      )
      const newProject = res.data?.data?.project
      if (newProject?._id) {
        setProjects(prev => [newProject, ...prev])
      } else {
        await fetchProjects()
      }
      setShowModal(false)
      setForm({ name: '', description: '', color: '#6366f1', members: [] })
      showToast('Project created successfully')
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(localSearch.toLowerCase()) ||
    p.description?.toLowerCase().includes(localSearch.toLowerCase())
  )

  const handleDeleteProject = async (projectId) => {
    setConfirmModal({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? All boards and tasks will be permanently removed.',
      confirmText: 'Delete Project',
      onConfirm: async () => {
        try {
          setDeleting(projectId)
          await api.delete(`/organizations/${orgId}/projects/${projectId}`)
          setProjects(prev => prev.filter(p => p._id !== projectId))
          showToast('Project deleted successfully')
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete project', 'error')
        } finally {
          setDeleting(null)
          setOpenMenuId(null)
          setConfirmModal(null)
        }
      }
    })
  }

  if (!activeOrgId && !loading) {
    return (
      <EmptyOrg
        icon="folder"
        title="No Organization Yet"
        description="Create an organization to start managing projects and tracking progress."
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <span className="material-symbols-outlined text-[48px] text-red-400 block mb-3">
          error_outline
        </span>
        <p className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Could not load projects
        </p>
        <button
          onClick={fetchProjects}
          className="text-indigo-500 text-sm hover:underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500">Manage and track your team's initiatives.</p>
        </div>
        {perms.canCreateProject && (
          <button 
            onClick={() => setShowModal(true)}
            className="orbit-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Project
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1" ref={localSearchRef}>
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              search
            </span>
          </div>
          <input 
            type="text"
            placeholder="Search projects..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchDrop(true)
            }}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border-none outline-none transition-all
              ${isDark
                ? 'bg-[rgba(255,255,255,0.06)] text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/30'
                : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500/20'
              }`}
          />

          {showSearchDrop && searchResults.length > 0 && (
            <div className={`absolute top-full left-0 mt-1 w-72 rounded-xl shadow-xl z-30 overflow-hidden
              ${isDark
                ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                : 'bg-white border border-slate-200'
              }`}>
              <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b
                ${isDark
                  ? 'text-slate-600 border-[rgba(255,255,255,0.06)]'
                  : 'text-slate-400 border-slate-100'
                }`}>
                Projects — click to open board
              </div>
              {searchResults.map(p => (
                <button
                  key={p._id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSearchDrop(false)
                    setLocalSearch('')
                    navigate(`/org/${orgId}/projects/${p._id}/board`)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${isDark
                      ? 'hover:bg-white/5 text-slate-300'
                      : 'hover:bg-slate-50 text-slate-700'
                    }`}>
                  <div className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-xs text-slate-500 truncate">{p.description}</p>
                    )}
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    Board
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-400 dark:bg-[#161616] dark:border-[rgba(255,255,255,0.07)]'}`}
          >
            <span className="material-symbols-outlined block">grid_view</span>
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2.5 rounded-lg border transition-colors ${viewMode === 'list' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' : 'bg-white border-slate-200 text-slate-400 dark:bg-[#161616] dark:border-[rgba(255,255,255,0.07)]'}`}
          >
            <span className="material-symbols-outlined block">view_list</span>
          </button>
        </div>
      </div>

      {/* PROJECT GRID/LIST */}
      {projects.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] rounded-2xl max-w-md mx-auto text-center shadow-sm">
          <div className="size-16 rounded-full bg-slate-50 dark:bg-[#111] flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-[36px] text-slate-450 dark:text-slate-550">
              folder_open
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">No active projects</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-6 max-w-xs">
            Start collaborating with your team by launching a project workspace.
          </p>
          {perms.canCreateProject && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
            >
              + Launch Project
            </button>
          )}
        </div>
      ) : projects.length > 0 && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-700 mb-3">search_off</span>
          <p className="text-slate-500 dark:text-slate-400">No projects match your search.</p>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="projects-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/org/${orgId}/projects/${project._id}/board`)}
                className="orbit-project-card bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] p-5 rounded-xl cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: project.color || '#6366f1' }} />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{project.name}</h3>
                  </div>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === project._id ? null : project._id)}
                      className="p-1 rounded-md text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                    </button>
                    {openMenuId === project._id && (
                      <div className="absolute right-0 top-8 w-44 rounded-xl shadow-xl z-20 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <button
                          onClick={() => { setOpenMenuId(null); navigate(`/org/${orgId}/projects/${project._id}/board`) }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          Open Board
                        </button>
                        {perms.canDeleteProject && (
                          <>
                            <div className="border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)]" />
                            <button
                              onClick={() => handleDeleteProject(project._id)}
                              disabled={deleting === project._id}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              {deleting === project._id ? 'Deleting...' : 'Delete project'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[32px]">
                  {project.description || 'No description'}
                </p>

                <div className="flex gap-4 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span>{project.members?.length || 0} members</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-[rgba(255,255,255,0.05)]">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    project.status === 'archived' 
                      ? 'bg-slate-100 text-slate-600 dark:bg-[rgba(255,255,255,0.06)] dark:text-slate-400'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-[rgba(16,185,129,0.12)] dark:text-emerald-400'
                  }`}>
                    {project.status || 'active'}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-600">
                    {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Task count expansion */}
                <div className={`flex items-center gap-3 mt-3 pt-3 border-t ${isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[14px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>checklist</span>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {projectStats[project._id]?.total || 0} tasks
                    </span>
                  </div>
                  {(projectStats[project._id]?.done || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                      <span className="text-xs text-emerald-500">{projectStats[project._id]?.done} done</span>
                    </div>
                  )}
                  {(projectStats[project._id]?.active || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-indigo-500">pending</span>
                      <span className="text-xs text-indigo-400">{projectStats[project._id]?.active} active</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : isMobile ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {filtered.map(p => (
              <div
                key={p._id}
                className="orbit-project-card"
                onClick={() => navigate(
                  `/org/${orgId}/projects/${p._id}/board`
                )}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isDark ? '#161616' : 'white',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}`,
                  cursor: 'pointer',
                }}>
                {/* Color dot */}
                <div style={{
                  width: '10px', height: '10px',
                  borderRadius: '50%',
                  background: p.color || '#6366f1',
                  flexShrink: 0,
                }} />
                {/* Project info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: isDark ? '#475569' : '#94a3b8',
                    marginTop: '2px',
                  }}>
                    {p.members?.length || 1} members ·{' '}
                    {projectStats[p._id]?.total || 0} tasks
                  </p>
                </div>
                {/* Status badge */}
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: p.status === 'archived' 
                      ? (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9')
                      : 'rgba(16,185,129,0.12)',
                  color: p.status === 'archived' 
                      ? (isDark ? '#94a3b8' : '#475569') 
                      : '#10b981',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {p.status || 'ACTIVE'}
                </span>
                {/* Arrow */}
                <span className="material-symbols-outlined"
                  style={{ fontSize: '16px',
                           color: '#6366f1',
                           flexShrink: 0 }}>
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] bg-slate-50/50 dark:bg-[rgba(255,255,255,0.02)]">
              <span className="col-span-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Project</span>
              <span className="col-span-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Status</span>
              <span className="col-span-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Members</span>
              <span className="col-span-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Tasks</span>
              <span className="col-span-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">Created</span>
              <span className="col-span-1" />
            </div>

            {/* Rows */}
            {filtered.map(project => (
              <div key={project._id}
                   onClick={() => navigate(`/org/${orgId}/projects/${project._id}/board`)}
                   className="orbit-member-row grid grid-cols-12 gap-4 px-5 py-4 border-b last:border-0 border-slate-50 dark:border-[rgba(255,255,255,0.04)] cursor-pointer group">

                {/* Project name + description */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="size-3 rounded-full shrink-0"
                       style={{ backgroundColor: project.color || '#6366f1' }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-xs truncate text-slate-500 dark:text-slate-500">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    project.status === 'archived'
                      ? 'bg-slate-100 text-slate-600 dark:bg-[rgba(255,255,255,0.06)] dark:text-slate-400'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-[rgba(16,185,129,0.12)] dark:text-emerald-400'
                  }`}>
                    {project.status || 'active'}
                  </span>
                </div>

                {/* Members */}
                <div className="col-span-2 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">group</span>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                    {project.members?.length || 0} Members
                  </span>
                </div>

                {/* Tasks */}
                <div className="col-span-2 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">checklist</span>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                    {projectStats[project._id]?.total || 0}
                  </span>
                  {(projectStats[project._id]?.done || 0) > 0 && (
                    <span className="text-[10px] text-emerald-500 ml-1">
                      ({projectStats[project._id]?.done} done)
                    </span>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-1 flex items-center text-sm text-slate-500 dark:text-slate-500">
                  {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === project._id ? null : project._id)}
                      className="p-1 rounded-md text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                    </button>
                    {openMenuId === project._id && (
                      <div className="absolute right-0 top-8 w-44 rounded-xl shadow-xl z-20 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <button
                          onClick={() => { setOpenMenuId(null); navigate(`/org/${orgId}/projects/${project._id}/board`) }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          Open Board
                        </button>
                        {perms.canDeleteProject && (
                          <>
                            <div className="border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)]" />
                            <button
                              onClick={() => handleDeleteProject(project._id)}
                              disabled={deleting === project._id}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              {deleting === project._id ? 'Deleting...' : 'Delete project'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div 
          className="orbit-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'flex-start',
            justifyContent: 'center',
            padding: isMobile ? '0' : '16px',
            paddingTop: isMobile ? '0' : 'max(16px, env(safe-area-inset-top))',
            overflowY: 'auto',
          }}
        >
          <div 
            className="orbit-modal-content p-6" 
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: isMobile ? '90vh' : 'calc(100vh - 32px)',
              overflowY: 'auto',
              borderRadius: isMobile ? '24px 24px 0 0' : '16px',
              background: isDark ? '#141414' : '#ffffff',
              border: `1px solid ${isDark
                ? 'rgba(255,255,255,0.08)'
                : '#e2e8f0'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom))' : '24px',
            }}
          >
            {/* Grabber indicator for mobile bottom sheets */}
            {isMobile && (
              <div style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                margin: '0 auto 16px',
              }} />
            )}

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Project</h2>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Set up a new space for your team to collaborate.</p>
            
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Website redesign, Mobile app..."
                  value={form.name}
                  onChange={(e) => { setForm(prev => ({...prev, name: e.target.value})); setFormError(''); }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({...prev, description: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Add Team Members</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                  {orgMembers.filter(m => (m.user?._id || m._id) !== user._id).map(m => {
                    const mid = m.user?._id || m._id
                    const isSelected = form.members.includes(mid)
                    return (
                      <button
                        key={mid}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            members: isSelected 
                              ? prev.members.filter(id => id !== mid)
                              : [...prev.members, mid]
                          }))
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-500'
                        }`}
                      >
                        <div className="size-4 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden">
                          {m.user?.avatar ? <img src={m.user.avatar} className="size-full object-cover" /> : m.user?.name?.charAt(0)}
                        </div>
                        {m.user?.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Theme Color</label>
                <div className="flex gap-2.5 mt-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm(prev => ({...prev, color: c}))}
                      className={`size-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#141414] scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {formError && <p className="text-red-500 text-xs">{formError}</p>}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => { setShowModal(false); setForm({ name: '', description: '', color: '#6366f1', members: [] }); setFormError(''); }}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {creating ? (
                  <div className="size-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : null}
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODALS */}
      {confirmModal && (
        <ConfirmModal
          isDark={isDark}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          confirmColor={confirmModal.confirmColor}
          onConfirm={confirmModal.onConfirm}
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
  )
}


export default ProjectsPage;
