import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../services/axios'
import { useTheme } from '../context/ThemeContext'
import Toast from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { getPermissions } from '../utils/permissions'

const MembersPage = () => {
  const { user, activeOrgId } = useSelector(s => s.auth)
  const navigate = useNavigate()
  const { isDark } = useTheme()

  // Priority: activeOrgId (from org switcher) first
  const orgId = activeOrgId
             || user?.organization?._id
             || (typeof user?.organization === 'string'
                 ? user.organization : null)

  console.log('MembersPage orgId:', orgId)
  console.log('activeOrgId:', activeOrgId)
  console.log('user.organization:', user?.organization)

  const [members, setMembers] = useState([])



  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '', role: 'member'
  })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [revoking, setRevoking] = useState(null)
  const [pendingInvites, setPendingInvites] = useState([])
  const [confirmModal, setConfirmModal] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const showConfirm = useCallback((config) => {
    setConfirmModal(config)
  }, [])

  const roleColors = {
    owner: {
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      label: 'Owner',
    },
    admin: {
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
      label: 'Admin',
    },
    member: {
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
      label: 'Member',
    },
  }

  // Get current user's role in this org
  const currentUserMembership = members.find(
    m => m.user?._id === user?._id
  )
  const userRole = currentUserMembership?.role || 'viewer'
  const perms = getPermissions(userRole)

  useEffect(() => {
    if (orgId) fetchMembers()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    setRoleFilter('all')
    setSearch('')
  }, [orgId])


  // Click outside to close action menus
  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const [membersRes, invitesRes] = await Promise.all([
        api.get(`/organizations/${orgId}/members`),
        api.get(`/organizations/${orgId}/invitations`)
          .catch(() => ({ data: { data: { invitations: [] } } })),
      ])
      const data = membersRes.data?.data?.members || []
      setMembers(Array.isArray(data) ? data : [])
      console.log('[FILTER DEBUG] First member raw:',
        JSON.stringify(members[0] || data[0], null, 2)
      )
      console.log('[FILTER DEBUG] roleFilter state:',
        roleFilter
      )
      const invites = invitesRes.data?.data?.invitations || []
      setPendingInvites(invites)
    } catch (err) {
      console.error('Fetch members error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (membershipId, userId) => {
    showConfirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member? They will lose access to all projects.',
      confirmText: 'Remove Member',
      onConfirm: async () => {
        try {
          setRemoving(userId)
          await api.delete(`/organizations/${orgId}/members/${userId}`)
          setMembers(prev => prev.filter(m => m.user?._id !== userId))
          showToast('Member removed successfully')
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to remove member', 'error')
        } finally {
          setRemoving(null)
          setOpenMenuId(null)
          setConfirmModal(null)
        }
      }
    })
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      setOpenMenuId(null)
      await api.patch(`/organizations/${orgId}/members`, {
        userId,
        role: newRole,
      })
      setMembers(prev => prev.map(m =>
        m.user?._id === userId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change role', 'error')
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      setInviteError('Email is required')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteForm.email)) {
      setInviteError('Please enter a valid email')
      return
    }
    try {
      setInviting(true)
      setInviteError('')
      await api.post(`/organizations/${orgId}/invite`, {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      })

      setInviteSuccess(true)

      // Refresh pending invitations immediately without full page reload
      const invitesRes = await api.get(`/organizations/${orgId}/invitations`)
      setPendingInvites(invitesRes.data?.data?.invitations || [])

      showToast(`Invitation sent successfully!`, 'success')

      setTimeout(() => {
        setShowModal(false)
        setInviteForm({ email: '', role: 'member' })
        setInviteError('')
        setInviteSuccess(false)
      }, 1500)
    } catch (err) {
      setInviteError(
        err.response?.data?.message ||
        'Failed to send invite. Please try again.'
      )
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId) => {
    showConfirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this invitation?',
      confirmText: 'Revoke',
      onConfirm: async () => {
        try {
          setRevoking(invitationId)
          await api.delete(`/organizations/${orgId}/invitations/${invitationId}`)
          setPendingInvites(prev => prev.filter(i => i._id !== invitationId))
          showToast('Invitation revoked')
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to revoke invitation', 'error')
        } finally {
          setRevoking(null)
          setConfirmModal(null)
        }
      }
    })
  }

  const totalMembers = members.length
  const activeMembers = members.length



  // ─── Filter logic — plain variable, no hooks ───
  const roleTarget = (roleFilter || 'all')
    .toLowerCase().trim()

  const filtered = members.filter(m => {
    const mRole = String(m?.role || '')
      .toLowerCase().trim()
    const mName = String(m?.user?.name || '')
      .toLowerCase()
    const mEmail = String(m?.user?.email || '')
      .toLowerCase()
    const q = String(search || '')
      .toLowerCase().trim()

    const searchOk = !q ||
      mName.includes(q) ||
      mEmail.includes(q)

    const standardRoles =
      ['owner', 'admin', 'member']
    const normalizedRole =
      standardRoles.includes(mRole)
        ? mRole
        : 'member'
    const matchRole =
      roleTarget === 'all' ||
      normalizedRole === roleTarget

    return searchOk && matchRole
  })

  console.log('[MEMBERS]', {
    roleFilter, roleTarget,
    total: members.length,
    filtered: filtered.length,
    roles: members.map(m => m?.role),
  })

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} style={{
            textAlign: 'center',
            padding: '60px',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid #6366f1',
              borderTop: '2px solid transparent',
              animation:
                'orbit-spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
          </td>
        </tr>
      )
    }

    if (members.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="size-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-indigo-500 text-[24px]">group</span>
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Your roster is empty</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Onboard your team to start delegating tasks and tracking activity.</p>
              {perms.canInviteMembers && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                >
                  Invite Member
                </button>
              )}
            </div>
          </td>
        </tr>
      )
    }

    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="size-12 rounded-full bg-slate-50 dark:bg-[#111] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-slate-400 text-[24px]">search_off</span>
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">No results matched your search</h3>
              <p className="text-xs text-slate-500 mt-1">Try double checking your search terms or adjusting the designation filter.</p>
            </div>
          </td>
        </tr>
      )
    }

    return filtered.map(m => (
      <tr
        key={m._id}
        className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold overflow-hidden shadow-sm">
              {m.user?.avatar
                ? <img src={m.user.avatar}
                    className="size-full object-cover"
                    alt="" />
                : (m.user?.name?.charAt(0) || '?')}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                {m.user?.name || 'Unknown'}
              </p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">
                {m.user?.email || ''}
              </p>
            </div>
          </div>
        </td>

        <td className="px-6 py-4">
          {m.role === 'owner' ? (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-purple-500">
                workspace_premium
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                Owner
              </span>
              {m.user?._id === user?._id && (
                <span className="text-[10px] text-slate-400">
                  (you)
                </span>
              )}
            </div>
          ) : (
            <span
              className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: (roleColors[m.role] ||
                  roleColors.member).color,
                background: (roleColors[m.role] ||
                  roleColors.member).bg,
              }}
            >
              {(roleColors[m.role] ||
                roleColors.member).label}
            </span>
          )}
        </td>

        <td className="px-6 py-4 text-xs text-slate-500">
          {m.createdAt
            ? new Date(m.createdAt)
                .toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
            : '—'}
        </td>

        <td className="px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </td>

        <td className="px-6 py-4 text-right">
          {m.role !== 'owner' &&
           perms.canManageMembers ? (
            <div className="relative inline-block">
              <button
                onClick={e => {
                  e.stopPropagation()
                  setOpenMenuId(
                    openMenuId === m._id
                      ? null : m._id
                  )
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-[20px]">
                  more_horiz
                </span>
              </button>

              {openMenuId === m._id && (
                <div className="absolute right-0 top-8 w-44 rounded-xl shadow-xl z-20 overflow-hidden bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[rgba(255,255,255,0.08)]">
                  {perms.canChangeRoles && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Change Role
                      </div>
                      {['admin', 'member'].map(r => (
                        <button
                          key={r}
                          onClick={e => {
                            e.stopPropagation()
                            handleChangeRole(
                              m.user?._id, r
                            )
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                            m.role === r
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-500/10'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="capitalize">
                            {r}
                          </span>
                          {m.role === r && (
                            <span className="material-symbols-outlined text-[14px]">
                              check
                            </span>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)]" />
                    </>
                  )}
                  {m.user?._id !== user?._id && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleRemoveMember(
                          m._id, m.user?._id
                        )
                      }}
                      disabled={
                        removing === m.user?._id
                      }
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        person_remove
                      </span>
                      {removing === m.user?._id
                        ? 'Removing...'
                        : 'Revoke Access'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span />
          )}
        </td>
      </tr>
    ))
  }

  if (!loading && !orgId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-slate-700 mb-4">corporate_fare</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No organization yet</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">Create an organization on the Dashboard first.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
          Go to Dashboard
        </button>
      </div>
    )
  }
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-12">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Members</h1>
          <p className="text-sm text-slate-500">Manage your team and their permissions.</p>
        </div>
        {perms.canInviteMembers && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Invite Member
          </button>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {[
          { label: 'Total Members', value: totalMembers, icon: 'group', color: 'bg-indigo-500' },
          { label: 'Active', value: activeMembers, icon: 'check_circle', color: 'bg-emerald-500' },
          { label: 'Pending Invites', value: pendingInvites.length, icon: 'schedule', color: 'bg-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="flex-1 p-4 rounded-xl flex items-center gap-4 bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
            <div className={`size-10 rounded-lg ${stat.color} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTER */}
      <div style={{
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
  }}>
    {/* Search input */}
    <div style={{ flex: 1, position: 'relative' }}>
      <span
        className="material-symbols-outlined"
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '18px',
          color: isDark ? '#475569' : '#94a3b8',
          pointerEvents: 'none',
        }}
      >
        search
      </span>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 12px 9px 38px',
          borderRadius: '10px',
          border: `1px solid ${isDark
            ? 'rgba(255,255,255,0.08)'
            : '#e2e8f0'}`,
          background: isDark
            ? 'rgba(255,255,255,0.04)'
            : '#f8fafc',
          color: isDark ? '#e2e8f0' : '#1e293b',
          fontSize: '13px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>

    {/* Role filter — plain HTML select */}
    <select
      value={roleFilter}
      onChange={e => {
        setRoleFilter(e.target.value)
      }}
      style={{
        padding: '9px 14px',
        borderRadius: '10px',
        border: `1px solid ${isDark
          ? 'rgba(255,255,255,0.08)'
          : '#e2e8f0'}`,
        background: isDark ? '#161616' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#1e293b',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
        minWidth: '130px',
      }}
    >
      <option value="all">All Roles</option>
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
    </select>

    {/* Result count */}
    {roleFilter !== 'all' && (
      <span style={{
        fontSize: '12px',
        fontWeight: 700,
        color: '#6366f1',
        whiteSpace: 'nowrap',
      }}>
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </span>
    )}
  </div>

      {/* MEMBERS TABLE */}
      <div className="rounded-xl overflow-hidden bg-white dark:bg-[#161616] border border-slate-200 dark:border-[rgba(255,255,255,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-[rgba(255,255,255,0.02)] border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Collaborator</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Designation</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Onboarded</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[rgba(255,255,255,0.04)]">
    {renderRows()}
  </tbody>
          </table>
        </div>
      </div>

      {/* PENDING INVITATIONS */}
      {pendingInvites.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{
            fontSize: '12px', fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#475569' : '#94a3b8',
            marginBottom: '12px',
          }}>
            Pending Invitations ({pendingInvites.length})
          </h3>
          {pendingInvites.map(inv => (
            <div key={inv._id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: `1px solid ${isDark
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(245,158,11,0.2)'}`,
              background: isDark
                ? 'rgba(245,158,11,0.04)'
                : 'rgba(245,158,11,0.03)',
              marginBottom: '8px',
            }}>
              {/* Avatar placeholder */}
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: '18px',
                           color: '#f59e0b' }}>
                  schedule
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '14px', fontWeight: 500,
                  color: isDark ? '#e2e8f0' : '#1e293b',
                }}>
                  {inv.email}
                </p>
                <p style={{
                  fontSize: '11px',
                  color: isDark ? '#475569' : '#94a3b8',
                }}>
                  Invited as {inv.role} · Awaiting acceptance
                </p>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
              }}>
                Pending
              </span>
              {perms.canManageMembers && (
                <button
                  onClick={() =>
                    handleRevokeInvitation(
                      inv._id
                    )}
                  disabled={revoking === inv._id}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: revoking === inv._id ? 'not-allowed' : 'pointer',
                    color: revoking === inv._id ? '#94a3b8' : '#ef4444',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}>
                  {revoking === inv._id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* INVITE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl w-full max-w-md p-6">
            {inviteSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-300">
                <span className="material-symbols-outlined text-[48px] text-emerald-500 animate-bounce">check_circle</span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-4">Invitation sent!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We've sent an invite to {inviteForm.email}</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Onboard Collaborator</h2>
                <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Add a new collaborator to your organization.</p>
                
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Email Address</label>
                    <input
                      autoFocus
                      type="email"
                      placeholder="collaborator@example.com"
                      value={inviteForm.email}
                      onChange={(e) => { setInviteForm(prev => ({...prev, email: e.target.value})); setInviteError(''); }}
                      className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-1.5 block text-slate-600 dark:text-slate-400">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={e =>
                        setInviteForm(prev => ({
                          ...prev, role: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0f0f0f] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Note: There can only be one Owner per organization. Owner role cannot be assigned via invitation.</p>
                  </div>

                  {inviteError && <p className="text-red-500 text-xs font-medium">{inviteError}</p>}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button 
                    onClick={() => { setShowModal(false); setInviteForm({ email: '', role: 'member' }); setInviteError(''); }}
                    disabled={inviting}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={inviting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    {inviting ? <div className="size-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : null}
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </>
            )}
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


export default MembersPage;
