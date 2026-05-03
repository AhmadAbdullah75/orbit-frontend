import { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTheme } from '../context/ThemeContext'
import api from '../services/axios'
import { setCredentials } from '../store/slices/authSlice'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { getPermissions } from '../utils/permissions'

export default function SettingsPage() {
  const { isDark } = useTheme()
  const { user, activeOrgId } = useSelector(
    s => s.auth
  )

  const dispatch = useDispatch()
  const [currentOrg, setCurrentOrg] = useState(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [confirmModal, setConfirmModal] =
    useState(null)
  const [toast, setToast] = useState(null)

  const [profileName, setProfileName] =
    useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  const [avatarUploading, setAvatarUploading] =
    useState(false)
  const avatarInputRef = useRef(null)

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('orbit_notification_prefs')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      taskAssigned: true,
      taskCommented: true,
      memberAdded: true,
      projectUpdated: false,
      weeklyDigest: false,
    }
  })

  useEffect(() => {
    localStorage.setItem('orbit_notification_prefs', JSON.stringify(notifications))
  }, [notifications])

  const handleToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Fetch the ACTIVE org, not user's default org
  useEffect(() => {
    if (!activeOrgId) return
    setOrgLoading(true)
    api.get('/organizations')
      .then(res => {
        const orgs =
          res.data?.data?.organizations || []
        // Find the org that matches activeOrgId
        const active = orgs.find(
          o => o._id === activeOrgId
        )
        setCurrentOrg(active || null)
      })
      .catch(console.error)
      .finally(() => setOrgLoading(false))
  }, [activeOrgId])

  // Sync state if user object updates in Redux
  useEffect(() => {
    if (user?.name) setProfileName(user.name)
  }, [user])

  const [editingName, setEditingName] = useState(false)

  const handleSaveName = async () => {
    if (!profileName.trim()) {
      setNameError('Name cannot be empty')
      return
    }
    if (profileName.trim() === user?.name) {
      setNameError('This is already your name')
      return
    }
    setSavingName(true)
    setNameError('')
    try {
      const res = await api.patch('/auth/profile', {
        name: profileName.trim()
      })
      const updatedUser = res.data?.data?.user

      // Update Redux state
      dispatch(setCredentials({
        user: { ...user, ...updatedUser },
        token: localStorage.getItem('token') ||
          user?.token,
      }))

      setEditingName(false)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } catch (err) {
      const msg = err.response?.data?.message
      setNameError(msg || 'Failed to update name')
      console.error('Name update error:',
        err.response?.data)
    } finally {
      setSavingName(false)
    }
  }

  const handleDeleteOrg = () => {
    if (!currentOrg) return

    setConfirmModal({
      title: 'Delete Organization',
      message: `Are you sure you want to permanently delete "${currentOrg.name}"? All projects, boards, tasks and members will be removed. This cannot be undone.`,
      confirmText: 'Delete Organization',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      icon: 'delete_forever',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await api.delete(
            `/organizations/${activeOrgId}`
          )
          setToast({
            message: 'Organization deleted.',
            type: 'success'
          })
          // Clear active org and redirect
          localStorage.removeItem('activeOrgId')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1500)
        } catch (err) {
          setToast({
            message: err.response?.data?.message ||
              'Failed to delete organization.',
            type: 'error'
          })
        }
      }
    })
  }

  const Toggle = ({ active, onToggle }) => (
    <div 
      onClick={onToggle}
      className={`w-9 h-5 rounded-full cursor-pointer transition-colors relative flex items-center px-0.5 ${active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-[rgba(255,255,255,0.1)]'}`}
    >
      <div className={`size-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account and workspace preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#141414] border-[rgba(255,255,255,0.06)]' : 'bg-white border-slate-200'}`}>
          <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">person</span>
            Profile Information
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="size-24 rounded-full border-4 border-slate-100 dark:border-[rgba(255,255,255,0.04)] overflow-hidden relative group">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </button>
              </div>
              <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setAvatarUploading(true)
                    const formData = new FormData()
                    formData.append('avatar', file)
                    const res = await api.put('/auth/me/avatar', formData)
                    const updatedUser = res.data?.user || res.data?.data?.user
                    if (updatedUser) {
                      dispatch(setCredentials({ user: updatedUser, token: localStorage.getItem('token') }))
                    }
                  } catch (err) {
                    console.error('Avatar upload failed:', err)
                  } finally {
                    setAvatarUploading(false)
                  }
                }}
              />
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-bold">
                {avatarUploading ? 'Uploading...' : 'Click image to change'}
              </p>
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Full Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-none outline-none transition-all ${isDark ? 'bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/20' : 'bg-slate-100 text-slate-900 focus:ring-2 focus:ring-indigo-500/20'}`}
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={savingName || profileName === user?.name}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
                  >
                    {savingName ? '...' : (nameSaved ? 'Saved!' : 'Save')}
                  </button>
                </div>
                {nameError && <p className="mt-1.5 text-xs text-red-500 font-medium px-1">{nameError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Email Address</label>
                <div className={`px-4 py-3 rounded-xl text-sm font-medium border border-transparent ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {user?.email}
                  <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 italic px-1">Email cannot be changed to prevent account hijacking.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Section */}
        <section className="rounded-xl overflow-hidden bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">Configure your organization</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-[rgba(255,255,255,0.04)]">
            <div className="px-6 py-4 flex justify-between items-center">
              <label className="text-sm font-medium text-slate-900 dark:text-white">Workspace Name</label>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {orgLoading
                  ? <span className="animate-pulse bg-slate-700 rounded h-4 w-32 inline-block" />
                  : currentOrg?.name || 'Your Organization'
                }
              </div>
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Plan</p>
                <p className="text-xs text-slate-500">Your current subscription</p>
              </div>
              <div className="flex items-center">
                <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-tighter">Free Plan</span>
                <button className="text-xs text-indigo-500 font-semibold cursor-pointer ml-3 hover:underline">Upgrade</button>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="rounded-xl overflow-hidden bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)] shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">Choose what to be notified about</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-[rgba(255,255,255,0.04)]">
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Task assignments</p>
                <p className="text-xs text-slate-500">When a task is assigned to you</p>
              </div>
              <Toggle 
                active={notifications.taskAssigned} 
                onToggle={() => handleToggle('taskAssigned')} 
              />
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Task comments</p>
                <p className="text-xs text-slate-500">When someone comments on your task</p>
              </div>
              <Toggle 
                active={notifications.taskCommented} 
                onToggle={() => handleToggle('taskCommented')} 
              />
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Member added</p>
                <p className="text-xs text-slate-500">When a new member joins the project</p>
              </div>
              <Toggle 
                active={notifications.memberAdded} 
                onToggle={() => handleToggle('memberAdded')} 
              />
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Project updates</p>
                <p className="text-xs text-slate-500">When project status changes</p>
              </div>
              <Toggle 
                active={notifications.projectUpdated} 
                onToggle={() => handleToggle('projectUpdated')} 
              />
            </div>
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Weekly digest</p>
                <p className="text-xs text-slate-500">Receive a weekly summary</p>
              </div>
              <Toggle 
                active={notifications.weeklyDigest} 
                onToggle={() => handleToggle('weeklyDigest')} 
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        {getPermissions(currentOrg?.role || currentOrg?.userRole || 'viewer').canDeleteOrg && (
          <section className="rounded-xl overflow-hidden bg-red-50/30 dark:bg-[rgba(239,68,68,0.04)] border border-red-100 dark:border-[rgba(239,68,68,0.1)] shadow-sm">
            <div className="px-6 py-4 border-b border-red-50 dark:border-[rgba(239,68,68,0.05)]">
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
              <p className="text-xs text-red-500/60 dark:text-red-400/50">Irreversible and destructive actions</p>
            </div>
            <div className="px-6 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">Delete Organization</p>
                <p className="text-xs text-red-400 dark:text-red-400/60 mt-1">Permanently delete this organization and all associated data.</p>
              </div>
              <button 
                onClick={handleDeleteOrg}
                className="px-4 py-2 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-sm font-semibold transition-colors"
              >
                Delete Organization
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="flex flex-col items-end mt-8">
        {/* Main save button removed in favor of inline saves */}
      </div>

      {confirmModal && (
        <ConfirmModal
          isDark={isDark}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          confirmColor={confirmModal.confirmColor}
          icon={confirmModal.icon}
          iconBg={confirmModal.iconBg}
          iconColor={confirmModal.iconColor}
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
