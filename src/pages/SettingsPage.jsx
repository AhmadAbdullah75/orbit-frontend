import { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTheme } from '../context/ThemeContext'
import api from '../services/axios'
import { setCredentials, updateUser } from '../store/slices/authSlice'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import { getPermissions } from '../utils/permissions'
import { useLocation, useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { isDark } = useTheme()
  const { user, activeOrgId } = useSelector(
    s => s.auth
  )

  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()

  // Refs for each section
  const profileRef = useRef(null)
  const workspaceRef = useRef(null)

  useEffect(() => {
    const section = location.state?.section
    if (section === 'profile' && profileRef.current) {
      setTimeout(() => {
        profileRef.current.scrollIntoView({
          behavior: 'smooth', block: 'start'
        })
      }, 100)
    } else if (section === 'workspace' &&
               workspaceRef.current) {
      setTimeout(() => {
        workspaceRef.current.scrollIntoView({
          behavior: 'smooth', block: 'start'
        })
      }, 100)
    }
  }, [location.state])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [confirmModal, setConfirmModal] =
    useState(null)
  const [toast, setToast] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] =
    useState(false)

  const [profileName, setProfileName] =
    useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  const [avatarUploading, setAvatarUploading] =
    useState(false)
  const [uploadProgress, setUploadProgress] =
    useState(0)
  const avatarInputRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg',
      'image/png', 'image/webp', 'image/gif'
    ]
    if (!allowedTypes.includes(file.type)) {
      showToast(
        'Please upload a JPG, PNG, WebP, or GIF',
        'error'
      )
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showToast(
        'Image must be smaller than 5MB',
        'error'
      )
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await api.post(
        '/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) /
              progressEvent.total
            )
            setUploadProgress(percent)
          },
        }
      )

      const avatarUrl =
        uploadRes.data?.data?.url ||
        uploadRes.data?.url

      if (!avatarUrl) {
        throw new Error('No URL returned from upload')
      }

      // Update user profile with new avatar
      const profileRes = await api.patch(
        '/auth/profile',
        {
          avatar: avatarUrl,
          name: user?.name || 'User',
        }
      )

      // After successful profile update:
      const updatedUserRes = await api.get('/auth/me')
      const updatedUser =
        updatedUserRes.data?.data?.user || updatedUserRes.data?.user

      if (updatedUser) {
        dispatch(updateUser(updatedUser))
      } else {
        dispatch(updateUser({ ...user, avatar: avatarUrl }))
      }

      showToast('Profile picture updated!', 'success')
    } catch (err) {
      console.error('Avatar upload error:', err)
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Upload failed. Check your connection.'
      showToast(msg, 'error')
    } finally {
      setAvatarUploading(false)
      setUploadProgress(0)
      // Reset file input
      e.target.value = ''
    }
  }

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
    if (!activeOrgId) {
      setOrgLoading(false)
      return
    }
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

  if (!orgLoading && !activeOrgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-700 mb-4">corporate_fare</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No organization yet</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">Create an organization on the Dashboard first.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div
      className="settings-page-wrap"
      style={{
        padding: '24px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
      <div className="mb-8">
        <h1
          className="orbit-page-title"
          style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
          Settings
        </h1>
        <p style={{
          fontSize: '14px',
          color: isDark ? '#64748b' : '#94a3b8',
        }}>
          Manage your account and workspace preferences.
        </p>
      </div>

      <div>
        {/* Profile Card */}
        <div
          ref={profileRef}
          className="settings-card"
          style={{
            background: isDark ? '#111' : 'white',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(99,102,241,0.1)'}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '14px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 700,
            color: isDark ? '#f1f5f9' : '#1e293b',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span className="material-symbols-outlined text-indigo-500">person</span>
            Profile Information
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                {/* Avatar image */}
                <div style={{
                  width: '80px', height: '80px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid rgba(99,102,241,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      style={{ width: '100%', height: '100%',
                               objectFit: 'cover' }}
                      onError={e => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span style={{
                      fontSize: '28px', fontWeight: 800,
                      color: 'white',
                    }}>
                      {(user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Upload overlay */}
                  {avatarUploading ? (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center', gap: '4px',
                    }}>
                      <div style={{
                        width: '24px', height: '24px',
                        borderRadius: '50%',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        animation: 'orbit-spin 0.8s linear infinite',
                      }} />
                      <span style={{
                        color: 'white', fontSize: '10px',
                        fontWeight: 600,
                      }}>
                        {uploadProgress}%
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 150ms',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={e =>
                      e.currentTarget.style.background = 'rgba(0,0,0,0.4)'
                    }
                    onMouseLeave={e =>
                      e.currentTarget.style.background = 'rgba(0,0,0,0)'
                    }>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          color: 'transparent',
                          fontSize: '20px',
                          transition: 'color 150ms',
                        }}
                        onMouseEnter={e =>
                          e.target.style.color = 'white'
                        }
                        onMouseLeave={e =>
                          e.target.style.color = 'transparent'
                        }>
                        photo_camera
                      </span>
                    </div>
                  )}
                </div>

                <input
                  id="avatar-input"
                  type="file"
                  ref={avatarInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <p style={{
                fontSize: '11px',
                color: isDark ? '#475569' : '#94a3b8',
                marginTop: '6px', textAlign: 'center',
              }}>
                Click to change · Max 5MB
              </p>
            </div>

            {/* Form Section */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Full Name</label>
                <div className="settings-name-row flex gap-2">
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-none outline-none transition-all ${isDark ? 'bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/20' : 'bg-slate-100 text-slate-900 focus:ring-2 focus:ring-indigo-500/20'}`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={savingName || profileName === user?.name}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      background: '#6366f1',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: savingName ? 'not-allowed' : 'pointer',
                      opacity: savingName ? 0.7 : 1,
                      minWidth: '80px',
                    }}>
                    {savingName ? 'Saving...' : (nameSaved ? 'Saved!' : 'Save')}
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
        <section
          ref={workspaceRef}
          className="settings-card overflow-hidden"
          style={{
            background: isDark ? '#111' : 'white',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(99,102,241,0.1)'}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '14px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <div className="border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] pb-4 mb-0">
            <h2 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#1e293b',
              marginBottom: '14px',
            }}>
              Workspace
            </h2>
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
            <div className="px-6 py-4">
              <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-tighter">Free Plan</span>
            </div>
          </div>
        </section>

        <div
          className="settings-card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            background: isDark
              ? 'rgba(99,102,241,0.08)'
              : 'rgba(99,102,241,0.05)',
            border: `1px solid ${isDark
              ? 'rgba(99,102,241,0.2)'
              : 'rgba(99,102,241,0.15)'}`,
            marginBottom: '14px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <span
              className="material-symbols-outlined"
              style={{ color: '#6366f1', fontSize: '24px' }}>
              workspace_premium
            </span>
            <div>
              <p style={{
                fontWeight: 700,
                fontSize: '14px',
                color: isDark ? '#f1f5f9' : '#1e293b',
                margin: 0,
              }}>
                Orbit Pro
              </p>
              <p style={{
                fontSize: '12px',
                margin: 0,
                color: isDark ? '#475569' : '#94a3b8',
              }}>
                You're on the free plan
              </p>
            </div>
          </div>
          <p style={{
            fontSize: '13px',
            color: isDark ? '#64748b' : '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '14px',
          }}>
            Pro features include unlimited projects,
            advanced analytics, custom domains, and
            priority support.
          </p>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px' }}>
              bolt
            </span>
            Upgrade to Pro — Coming Soon
          </button>
        </div>

        {/* Notifications Section */}
        <section
          className="settings-card overflow-hidden"
          style={{
            background: isDark ? '#111' : 'white',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(99,102,241,0.1)'}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '14px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
          <div className="border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)] pb-4">
            <h2 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#1e293b',
              marginBottom: '14px',
            }}>
              Notifications
            </h2>
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
          <section
            className="settings-card overflow-hidden"
            style={{
              background: isDark
                ? 'rgba(239,68,68,0.04)'
                : 'rgba(254,242,242,0.5)',
              border: `1px solid ${isDark
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(254,226,226,1)'}`,
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '14px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
            <div className="border-b border-red-50 dark:border-[rgba(239,68,68,0.05)] pb-4">
              <h2 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#ef4444',
                marginBottom: '14px',
              }}>
                Danger Zone
              </h2>
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

      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: isDark ? '#111' : 'white',
              borderRadius: '20px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              border: `1px solid ${isDark
                ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
            }}>

            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>

              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '24px', color: 'white' }}>
                  workspace_premium
                </span>
              </div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 800,
                color: 'white',
                margin: '0 0 4px',
              }}>
                Orbit Pro
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '13px',
                margin: 0,
              }}>
                Unlock the full potential of Orbit
              </p>
            </div>

            <div style={{ padding: '20px' }}>
              {[
                { icon: 'folder', text: 'Unlimited projects & boards' },
                { icon: 'group', text: 'Unlimited team members' },
                { icon: 'insights', text: 'Advanced analytics' },
                { icon: 'language', text: 'Custom domain' },
                { icon: 'support_agent', text: 'Priority support' },
              ].map((f, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 0',
                  borderBottom: i < 4
                    ? `1px solid ${isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#f8fafc'}`
                    : 'none',
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '16px',
                      color: '#6366f1',
                      flexShrink: 0,
                    }}>
                    {f.icon}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: isDark ? '#e2e8f0' : '#374151',
                    flex: 1,
                  }}>
                    {f.text}
                  </span>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px', color: '#10b981' }}>
                    check
                  </span>
                </div>
              ))}

              <div style={{
                marginTop: '16px',
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '10px',
                background: isDark
                  ? 'rgba(99,102,241,0.08)'
                  : 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                textAlign: 'center',
              }}>
                <p style={{
                  fontSize: '12px',
                  margin: 0,
                  color: isDark ? '#94a3b8' : '#64748b',
                  lineHeight: 1.5,
                }}>
                  🚀 <strong>Pro plan launching soon!</strong>
                  <br />
                  This is a portfolio demo project.{' '}
                  <a
                    href="mailto:iamahmad3027@gmail.com"
                    style={{
                      color: '#6366f1',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}>
                    Contact for early access
                  </a>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    border: `1px solid ${isDark
                      ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                    background: 'transparent',
                    color: isDark ? '#64748b' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  Maybe Later
                </button>
                <a
                  href="mailto:iamahmad3027@gmail.com?subject=Orbit Pro Early Access"
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px' }}>
                    bolt
                  </span>
                  Get Early Access
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
