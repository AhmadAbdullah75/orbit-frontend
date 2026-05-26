import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setCredentials, setActiveOrg } from '../store/slices/authSlice';
import { useTheme } from '../context/ThemeContext';
import api from '../services/axios';
import { getPermissions } from '../utils/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUp, scaleIn, scaleInRight, EASE } from '../utils/animations';
import { io } from 'socket.io-client';
import Toast from '../components/Toast';
import OrbitLogo from '../components/OrbitLogo';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/tasks', label: 'Tasks', icon: 'checklist' },
  { to: '/members', label: 'Members', icon: 'group' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/activity', label: 'Activity', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const mobileNavItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Home' },
  { path: '/projects', icon: 'folder', label: 'Projects' },
  { path: '/tasks', icon: 'checklist', label: 'Tasks' },
  { path: '/members', icon: 'group', label: 'Members' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export default function DashboardLayout() {

  // 1. ALL hooks first — no exceptions
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const currentPath = useLocation()
  const { user, token, activeOrgId } = useSelector(s => s.auth)
  const { isDark, toggleTheme } = useTheme()

  // 2. Derived values AFTER hooks
  const isBoardPage = currentPath.pathname.includes('/board')
  const isDashboard = currentPath.pathname === '/dashboard' || currentPath.pathname === '/'

  // 3. useState calls
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orgs, setOrgs] = useState(() => {
    try {
      const cached = localStorage.getItem('orbit_orgs_cache')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentPath.pathname])
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [createOrgError, setCreateOrgError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [inviteModal, setInviteModal] = useState(null)
  const [acceptingInvite, setAcceptingInvite] = useState(false)
  const [toast, setToast] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('orbit_sidebar_collapsed') === 'true'
  })
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  )
  const [isOnline, setIsOnline] = useState(
    () => typeof window !== 'undefined' ? window.navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)
  const showToast = React.useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // 4. useRef calls
  const notifRef = useRef(null)
  const searchRef = useRef(null)
  const orgDropdownRef = useRef(null)
  const profileMenuRef = useRef(null)

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const pageName = {
    '/dashboard': 'Dashboard',
    '/activity': 'Activity',
    '/projects': 'Projects',
    '/members': 'Members',
    '/settings': 'Settings',
  }[currentPath.pathname] || 'Dashboard';

  // Current org name
  const displayedOrg = React.useMemo(() => {
    if (orgs.length === 0) return null
    return orgs.find(o => o._id === activeOrgId) || orgs[0]
  }, [orgs, activeOrgId])

  const userRole = displayedOrg?.role || displayedOrg?.userRole || 'viewer';
  const perms = getPermissions(userRole);

  const activeOrgIdRef = useRef(activeOrgId)
  const lastFetchRef = useRef(0)

  useEffect(() => {
    activeOrgIdRef.current = activeOrgId
    if (activeOrgId) {
      localStorage.setItem('orbit_last_org_id', activeOrgId)
    }
  }, [activeOrgId])

  const fetchOrgs = React.useCallback(async (isInitialLoad = false) => {
    // Debounce: don't re-fetch within 30 seconds
    const now = Date.now()
    if (now - lastFetchRef.current < 30000
        && !isInitialLoad) return
    lastFetchRef.current = now

    try {
      const res = await api.get('/organizations')
      const data =
        res.data?.data?.organizations || []

      localStorage.setItem(
        'orbit_orgs_cache', JSON.stringify(data)
      )
      setOrgs(data)

      if (data.length === 0) return

      if (isInitialLoad) {
        // On FIRST load — restore the last org
        const savedOrgId = localStorage.getItem(
          'orbit_last_org_id'
        )

        if (savedOrgId) {
          // Verify the org still exists
          const savedOrg = data.find(
            o => o._id === savedOrgId
          )
          if (savedOrg) {
            // Restore! Don't fall through to first
            dispatch(setActiveOrg(savedOrg._id))
            return  // ← EXIT, don't override
          }
        }

        // No saved org or org not found — use first
        if (!activeOrgId || !data.find(
          o => o._id === activeOrgId
        )) {
          dispatch(setActiveOrg(data[0]._id))
        }
      } else {
        // Subsequent fetches — only fix if invalid
        const currentValid = data.find(
          o => o._id === activeOrgId
        )
        if (!currentValid) {
          dispatch(setActiveOrg(data[0]._id))
        }
      }
    } catch (err) {
      console.error('Fetch orgs error:', err)
      // Show cached orgs on error
      const cached = localStorage.getItem(
        'orbit_orgs_cache'
      )
      if (cached) {
        try { setOrgs(JSON.parse(cached)) } catch {}
      }
    }
  }, [activeOrgId, dispatch]);

  // Initial load effect — pass true
  useEffect(() => {
    if (user?._id) {
      fetchOrgs(true)  // ← isInitialLoad = true
    }
  }, [user?._id, fetchOrgs])

  // Subsequent org change
  useEffect(() => {
    if (activeOrgId) {
      fetchOrgs(false) // ← not initial
    }
  }, [activeOrgId, fetchOrgs]);

  // Click outside handlers
  useEffect(() => {
    const handler = (e) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target)) {
        setShowOrgDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || !activeOrgId) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/organizations/${activeOrgId}/projects`);
        const all = res.data?.data?.projects || [];
        const q = searchQuery.toLowerCase();
        const filtered = all.filter(p =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
        setSearchResults(filtered);
        setShowResults(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeOrgId]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}

    dispatch(logout()) // saves last org inside

    // Clear auth data but NOT last org
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('auth')
    localStorage.removeItem('activeOrgId')
    localStorage.removeItem('persist:root')
    localStorage.removeItem('orbit_orgs_cache')
    localStorage.removeItem('orbit_notification_prefs')
    // DO NOT remove orbit_last_org_id ← key fix

    window.location.replace('/login')
  }

  const POLL_INTERVAL = 120 * 1000

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.data?.notifications || []);
      setUnreadCount(res.data?.data?.unreadCount || 0);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  };

  useEffect(() => {
    if (!user?._id) return

    fetchNotifications()

    const interval = setInterval(
      fetchNotifications, POLL_INTERVAL
    )
    return () => clearInterval(interval)
  }, [user?._id, activeOrgId])

  useEffect(() => {
    if (!user?._id) return

    const socket = io(
      import.meta.env.VITE_SOCKET_URL,
      {
        auth: { token },
        transports: ['websocket', 'polling'],
      }
    )

    // Join personal user room
    socket.emit('join:user', user._id)

    // Listen for new notifications in real-time
    socket.on('notification:new', (notif) => {
      // Add to notifications list immediately
      setNotifications(prev => [notif, ...prev])
      // Increment unread count
      setUnreadCount(prev => prev + 1)
    })

    // Listen for members updated (after acceptance)
    socket.on('members:updated', ({ orgId }) => {
      if (orgId === activeOrgId) {
        // Refresh org data silently
        fetchOrgs()
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [user?._id, activeOrgId, token, fetchOrgs])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      setCreateOrgError('Name is required');
      return;
    }
    try {
      setCreatingOrg(true);
      setCreateOrgError('');
      const res = await api.post('/organizations', { name: newOrgName.trim() });
      const org = res.data?.data?.organization || res.data;
      setOrgs(prev => [org, ...prev]);
      dispatch(setActiveOrg(org._id));
      const meRes = await api.get('/auth/me');
      const updatedUser = meRes.data?.user || meRes.data;
      dispatch(setCredentials({ user: updatedUser, token }));
      setShowCreateOrgModal(false);
      setNewOrgName('');
      setShowOrgDropdown(false);
    } catch (err) {
      setCreateOrgError(err.response?.data?.message || 'Failed to create');
    } finally {
      setCreatingOrg(false);
    }
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        setWasOffline(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem('orbit_sidebar_collapsed', String(next))
  }

  const sidebarWidth = isDesktop
    ? (sidebarCollapsed ? 64 : 240)
    : 240

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Connection Status Banner (Offline/Online) */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={EASE.smoothSpring}
            style={{
              position: 'fixed',
              top: '20px',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
              width: 'fit-content',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.9)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '18px' }}>
              wifi_off
            </span>
            <span>You are currently offline. Some features may be unavailable.</span>
          </motion.div>
        )}

        {isOnline && wasOffline && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={EASE.smoothSpring}
            style={{
              position: 'fixed',
              top: '20px',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
              width: 'fit-content',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              wifi
            </span>
            <span>Connection restored. You are back online!</span>
            <button
              onClick={() => setWasOffline(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                opacity: 0.8,
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.8}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                close
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside
        className="flex flex-col flex-shrink-0 z-50"
        style={{
          width: `${sidebarWidth}px`,
          transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          overflowX: 'hidden',
          background: isDark ? '#0e0e0e' : '#ffffff',
          borderRight: `1px solid ${isDark
            ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
          transform: mobileMenuOpen || isDesktop
            ? 'translateX(0)'
            : 'translateX(-100%)',
        }}
      >

        {/* Sidebar header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed
            ? 'center' : 'space-between',
          padding: sidebarCollapsed ? '16px 0' : '16px 16px',
          borderBottom: `1px solid ${isDark
            ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
          flexShrink: 0,
        }}>
          <OrbitLogo
            size={32}
            showText={!sidebarCollapsed}
            textSize={17}
          />

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              style={{
                width: '28px', height: '28px',
                borderRadius: '8px',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#475569' : '#94a3b8',
                flexShrink: 0,
              }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '16px' }}>
                chevron_left
              </span>
            </button>
          )}
        </div>

        {/* Org Switcher */}
        {!sidebarCollapsed && (
        <div className="relative px-4 mb-4" ref={orgDropdownRef}>
          <button
            onClick={() => setShowOrgDropdown(p => !p)}
            className="w-full flex items-center justify-between p-2
                       rounded-lg transition-colors
                       border border-slate-200
                       dark:border-[rgba(255,255,255,0.07)]
                       hover:bg-slate-50
                       dark:hover:bg-[rgba(255,255,255,0.04)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-6 rounded bg-indigo-600
                              flex items-center justify-center
                              text-white text-xs font-bold shrink-0">
                {(displayedOrg?.name || 'W').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate
                               text-slate-700 dark:text-slate-300">
                {displayedOrg?.name || 'Workspace'}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px]
                             text-slate-400">
              unfold_more
            </span>
          </button>

          {/* Org dropdown */}
          <AnimatePresence>
            {showOrgDropdown && (
              <motion.div 
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute top-full left-0 right-0 mt-1
                              rounded-xl shadow-xl z-50
                              bg-white dark:bg-[#1a1a1a]
                              border border-slate-200
                              dark:border-[rgba(255,255,255,0.08)]
                              overflow-hidden"
              >
                <div className="p-2 space-y-0.5">
                  {orgs.map(org => (
                    <button
                      key={org._id}
                      onClick={() => {
                        dispatch(setActiveOrg(org._id))
                        setShowOrgDropdown(false)
                        navigate('/dashboard')
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: org._id === activeOrgId
                          ? isDark
                            ? 'rgba(99,102,241,0.12)'
                            : 'rgba(99,102,241,0.08)'
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}>
                      <div style={{
                        width: '24px', height: '24px',
                        borderRadius: '6px',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'white',
                        flexShrink: 0,
                      }}>
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{
                        flex: 1,
                        fontSize: '13px',
                        fontWeight: org._id === activeOrgId ? 600 : 400,
                        color: org._id === activeOrgId
                          ? '#6366f1'
                          : isDark ? '#e2e8f0' : '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {org.name}
                      </span>
                      {org._id === activeOrgId && (
                        <span className="material-symbols-outlined"
                          style={{ fontSize: '16px',
                                   color: '#6366f1' }}>
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-2">
                  {/* Separator */}
                  <div style={{
                    height: '1px',
                    background: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9',
                    margin: '4px 0',
                  }} />

                  {/* Create Org — visible to ALL users */}
                  <button
                    onClick={() => {
                      setShowOrgDropdown(false)
                      setShowCreateOrgModal(true)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                    <div style={{
                      width: '24px', height: '24px',
                      borderRadius: '6px',
                      border: `1.5px dashed ${isDark
                        ? 'rgba(99,102,241,0.4)'
                        : 'rgba(99,102,241,0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '14px',
                                 color: '#6366f1' }}>
                        add
                      </span>
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#6366f1',
                    }}>
                      Create Organization
                    </span>
                  </button>
                </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
        )}

        {sidebarCollapsed && (
          <div style={{
            padding: '12px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <div
              style={{
                width: '32px', height: '32px',
                borderRadius: '8px', background: '#6366f1',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                fontSize: '14px', fontWeight: 700,
                color: 'white',
              }}
              onClick={() => setSidebarCollapsed(false)}
              title={displayedOrg?.name}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') setSidebarCollapsed(false)
              }}>
              {(displayedOrg?.name || 'W').charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto pt-2 px-2">
          {navLinks.map((link) => {
            const isActive = currentPath.pathname === link.to || (link.to !== '/dashboard' && currentPath.pathname.startsWith(link.to));
            return (
            <div key={link.to} className="relative mb-1">
              {!sidebarCollapsed && isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    background: isDark ? 'rgba(103,100,242,0.12)' : '#f1f5f9',
                  }}
                  transition={EASE.smoothSpring}
                />
              )}
              <NavLink
                to={link.to}
                title={sidebarCollapsed ? link.label : ''}
                className="orbit-nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: sidebarCollapsed ? 0 : '10px',
                  justifyContent: sidebarCollapsed
                    ? 'center' : 'flex-start',
                  padding: sidebarCollapsed ? '10px' : '10px 12px',
                  borderRadius: '10px',
                  background: isActive
                    ? isDark
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(99,102,241,0.08)'
                    : 'transparent',
                  color: isActive
                    ? '#6366f1'
                    : isDark ? '#64748b' : '#94a3b8',
                  textDecoration: 'none',
                  width: '100%',
                  transition: 'all 150ms',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span className="material-symbols-outlined"
                  style={{ fontSize: '20px', flexShrink: 0 }}>
                  {link.icon}
                </span>
                {!sidebarCollapsed && (
                  <span style={{
                    fontSize: '13px', fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}>
                    {link.label}
                  </span>
                )}
              </NavLink>
            </div>
          )})}
        </nav>

        {sidebarCollapsed && (
          <div style={{ marginTop: 'auto', padding: '12px' }}>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              style={{
                width: '40px', height: '40px',
                borderRadius: '10px',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#475569' : '#94a3b8',
                margin: '0 auto',
              }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '20px' }}>
                chevron_right
              </span>
            </button>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-[rgba(255,255,255,0.06)] relative">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
            style={{
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-[rgba(255,255,255,0.1)] bg-[#6764f2] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : userInitial}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 truncate leading-tight">{user?.email || ''}</p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-600">more_vert</span>
              </>
            )}
          </button>

          {isMobileMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 rounded-xl border shadow-2xl z-50 bg-white dark:bg-[#141414] border-slate-200 dark:border-[rgba(255,255,255,0.08)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[rgba(239,68,68,0.08)] transition-colors duration-150"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: !isDesktop
              ? 'block' : 'none',
          }}
        />
      )}

      {/* ── MAIN AREA ── */}
      <main className="main-content flex-1 flex flex-col min-w-0 overflow-hidden" style={{
        marginLeft: isDesktop ? `${sidebarWidth}px` : '0',
        transition: 'margin-left 250ms cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <header className="sticky top-0 z-30 h-[60px] flex items-center justify-between px-6 lg:px-8 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-slate-200 dark:border-[rgba(255,255,255,0.06)] transition-colors duration-150 flex-shrink-0">

          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(p => !p)}
              style={{
                display: !isDesktop ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined"
                style={{
                  fontSize: '20px',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                }}>
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 hidden md:flex">
              <span className="text-sm text-slate-400 dark:text-slate-500">Workspace</span>
              <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-700">chevron_right</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{pageName}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            {(currentPath.pathname === '/projects' || currentPath.pathname.includes('/board')) && (
              <div ref={searchRef} className="relative hidden sm:block w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  {searching
                    ? <div className="size-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    : <span className="material-symbols-outlined text-[16px] text-slate-400">search</span>
                  }
                </div>
                <input
                  type="text"
                  placeholder="Search projects... (⌘K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                  className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border-none bg-slate-100/70 dark:bg-[rgba(255,255,255,0.06)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[rgba(255,255,255,0.08)]">
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No results for "{searchQuery}"</p>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                          Projects
                        </div>
                        {searchResults.map(p => (
                          <button key={p._id}
                            onClick={() => {
                              setShowResults(false);
                              setSearchQuery('');
                              navigate(`/org/${activeOrgId}/projects/${p._id}/board`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)]">
                            <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{p.name}</p>
                              {p.description && <p className="text-xs text-slate-500 truncate">{p.description}</p>}
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_forward</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="w-px h-5 border-l border-slate-200 dark:border-[rgba(255,255,255,0.08)] mx-1" />

            {/* Theme Toggle — uses isDark boolean from ThemeContext */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#6764f2] hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-150"
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <motion.button
                animate={unreadCount > 0
                  ? { rotate: [0, -12, 12, -8, 8, 0] }
                  : {}}
                transition={{ duration: 0.5, type: 'tween', ease: 'easeInOut' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowNotifications(p => !p);
                  if (!showNotifications && unreadCount > 0) {
                    handleMarkAllRead();
                  }
                }}
                className="relative size-8 rounded-md flex items-center justify-center transition-colors text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[rgba(255,255,255,0.06)]"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0 }}>
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      animation: 'orbit-ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                    }} />
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: 'white', fontWeight: 700,
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
              {showNotifications && (
                <motion.div
                  variants={scaleInRight}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute right-0 top-10 w-80 rounded-xl shadow-xl z-50 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[rgba(255,255,255,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-indigo-500 hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-700">notifications_none</span>
                        <p className="text-sm text-slate-400 dark:text-slate-600">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif._id}
                          className="orbit-notif-item"
                          onClick={async () => {
                            console.log('[NOTIF CLICK]', notif)
                            handleMarkRead(notif._id)

                            const isInvitation =
                              notif.type === 'invitation' ||
                              notif.message?.toLowerCase()
                                .includes('invited') ||
                              notif.metadata?.invitationToken

                            if (!isInvitation) return

                            let token = notif.metadata?.invitationToken

                            if (!token) {
                              try {
                                const res = await api.get(
                                  '/organizations/my-invitations'
                                )
                                const pending =
                                  res.data?.data?.invitations || []
                                const match = pending.find(inv =>
                                  inv.organization?.name ===
                                    notif.metadata?.orgName ||
                                  inv.status === 'pending'
                                )
                                if (match) {
                                  token = match.token
                                }
                              } catch (e) {
                                console.error(
                                  'Could not fetch invite:', e
                                )
                              }
                            }

                            if (token) {
                              setInviteModal({
                                ...notif,
                                metadata: {
                                  ...notif.metadata,
                                  invitationToken: token,
                                  orgName: notif.metadata?.orgName ||
                                    notif.message,
                                  role: notif.metadata?.role ||
                                    'member',
                                },
                              })
                            }
                            setShowNotifications(false)
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: notif.type === 'invitation'
                              ? 'pointer' : 'default',
                            borderBottom: `1px solid ${isDark
                              ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`,
                            background: notif.isRead
                              ? 'transparent'
                              : isDark
                                ? 'rgba(99,102,241,0.06)'
                                : 'rgba(99,102,241,0.04)',
                            transition: 'background 150ms',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex',
                                        gap: '10px',
                                        alignItems: 'flex-start' }}>
                            {/* Sender avatar */}
                            <div style={{
                              width: '32px', height: '32px',
                              borderRadius: '50%',
                              background: notif.type === 'invitation'
                                ? 'rgba(99,102,241,0.15)'
                                : 'rgba(16,185,129,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <span className="material-symbols-outlined"
                                style={{
                                  fontSize: '16px',
                                  color: notif.type === 'invitation'
                                    ? '#6366f1' : '#10b981',
                                }}>
                                {notif.type === 'invitation'
                                  ? 'person_add' : 'notifications'}
                              </span>
                            </div>

                            <div style={{ flex: 1 }}>
                              <p style={{
                                fontSize: '12px',
                                lineHeight: 1.4,
                                color: isDark ? '#e2e8f0' : '#1e293b',
                                margin: 0,
                              }}>
                                <strong>
                                  {notif.sender?.name || 'Someone'}
                                </strong>
                                {' '}{(notif.message || '')
                                  .replace(notif.sender?.name || '', '')
                                  .trim()}
                              </p>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: '4px',
                              }}>
                                <p style={{
                                  fontSize: '10px',
                                  color: isDark ? '#475569' : '#94a3b8',
                                }}>
                                  {notif.createdAt
                                    ? timeAgo(notif.createdAt)
                                    : 'Just now'}
                                </p>
                                {notif.type === 'invitation' && (
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#6366f1',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(99,102,241,0.1)',
                                  }}>
                                    Tap to respond
                                  </span>
                                )}
                              </div>
                            </div>

                            {!notif.isRead && (
                              <div style={{
                                width: '8px', height: '8px',
                                borderRadius: '50%',
                                background: '#6366f1',
                                flexShrink: 0,
                                marginTop: '4px',
                              }} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div
              ref={profileMenuRef}
              style={{ position: 'relative' }}
            >
              {/* Clickable Avatar Button */}
              <button
                type="button"
                onClick={() =>
                  setShowProfileMenu(p => !p)
                }
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${showProfileMenu
                    ? '#6366f1'
                    : 'transparent'}`,
                  cursor: 'pointer',
                  background: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'white',
                  padding: 0,
                  transition: 'border-color 150ms',
                }}>
                {user?.avatar
                  ? <img
                      src={user.avatar}
                      style={{ width: '100%',
                               height: '100%',
                               objectFit: 'cover' }}
                      alt="Profile"
                    />
                  : (user?.name?.charAt(0) || 'U')
                       .toUpperCase()
                }
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '220px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.08)'
                    : '#e2e8f0'}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}>
                  {/* User info header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9'}`,
                  }}>
                    <div style={{ display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'white',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {user?.avatar
                          ? <img src={user.avatar}
                              style={{ width: '100%',
                                       height: '100%',
                                       objectFit: 'cover' }}
                            />
                          : (user?.name?.charAt(0) ||
                             'U').toUpperCase()
                        }
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isDark ? '#f1f5f9' : '#0f172a',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {user?.name || 'User'}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: isDark ? '#475569' : '#94a3b8',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {user?.email || ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/settings', {
                          state: { section: 'profile' }
                        })
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '17px' }}>
                        person
                      </span>
                      My Profile
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/settings', {
                          state: { section: 'workspace' }
                        })
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '17px' }}>
                        settings
                      </span>
                      Settings
                    </button>

                    <div style={{
                      height: '1px',
                      background: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f1f5f9',
                      margin: '4px 0',
                    }} />

                    <button
                      onClick={async () => {
                        setShowProfileMenu(false)
                        await handleLogout()
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: '17px' }}>
                        logout
                      </span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className={`flex-1 overflow-y-auto ${isDark ? 'dot-grid-dark' : 'dot-grid-light'} ${isBoardPage ? 'p-0' : 'p-6'}`}>
          <motion.main
            key={currentPath.pathname}
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ flex: 1, minHeight: '100%' }}
          >
            <Outlet />
          </motion.main>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV (5 items) ── */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'none',
          height: '60px',
          background: isDark ? '#0e0e0e' : 'white',
          borderTop: `1px solid ${isDark
            ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
          zIndex: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div style={{
          display: 'flex',
          height: '100%',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}>
          {mobileNavItems.map(item => {
            const isActive =
              currentPath.pathname === item.path ||
              currentPath.pathname.startsWith(item.path + '/')
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  flex: 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '22px',
                    color: isActive ? '#6366f1' : '#94a3b8',
                  }}
                >
                  {item.icon}
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#6366f1' : '#94a3b8',
                }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Create Org Modal */}
      <AnimatePresence>
      {showCreateOrgModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-start justify-center pt-[15vh] px-4"
        >
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Organization</h2>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">Create a separate workspace for a new team.</p>
            <div className="mt-5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Organization Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Acme Corp, Design Team..."
                value={newOrgName}
                onChange={e => { setNewOrgName(e.target.value); setCreateOrgError(''); }}
                onKeyDown={e => e.key === 'Enter' && !creatingOrg && handleCreateOrg()}
                className="w-full px-3 py-2.5 rounded-lg text-sm border bg-slate-50 dark:bg-[#0f0f0f] border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {createOrgError && <p className="text-red-500 text-xs mt-1.5">{createOrgError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={creatingOrg}
                onClick={() => { setShowCreateOrgModal(false); setNewOrgName(''); setCreateOrgError(''); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-[rgba(255,255,255,0.08)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                disabled={creatingOrg}
                onClick={handleCreateOrg}
                className="orbit-btn-primary px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 flex items-center gap-2 border border-transparent"
              >
                {creatingOrg ? (
                  <><div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Creating...</>
                ) : 'Create Organization'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Invitation Accept/Decline Modal */}
      {inviteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '380px',
            background: isDark ? '#111' : 'white',
            borderRadius: '20px',
            padding: '32px',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            {/* Icon */}
            <div style={{
              width: '60px', height: '60px',
              borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '30px',
                         color: '#6366f1' }}>
                group_add
              </span>
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#0f172a',
              textAlign: 'center',
              marginBottom: '8px',
            }}>
              Team Invitation
            </h3>

            <p style={{
              fontSize: '14px',
              color: isDark ? '#64748b' : '#94a3b8',
              textAlign: 'center',
              lineHeight: 1.6,
              marginBottom: '8px',
            }}>
              <strong style={{
                color: isDark ? '#e2e8f0' : '#1e293b',
              }}>
                {inviteModal.sender?.name || 'Someone'}
              </strong>
              {' '}has invited you to join
            </p>

            <p style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#6366f1',
              textAlign: 'center',
              marginBottom: '6px',
            }}>
              {inviteModal.metadata?.orgName ||
               'their organization'}
            </p>

            <p style={{
              fontSize: '13px',
              color: isDark ? '#475569' : '#94a3b8',
              textAlign: 'center',
              marginBottom: '28px',
            }}>
              as{' '}
              <span style={{
                fontWeight: 600,
                color: isDark ? '#94a3b8' : '#64748b',
                textTransform: 'capitalize',
              }}>
                {inviteModal.metadata?.role || 'member'}
              </span>
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
            }}>
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                disabled={acceptingInvite}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                Decline
              </button>
              <button
                type="button"
                disabled={acceptingInvite}
                onClick={async () => {
                  setAcceptingInvite(true)
                  try {
                    const token = inviteModal.metadata?.invitationToken
                    const acceptRes = await api.post(
                      '/organizations/invite/accept',
                      { token }
                    )
                    
                    // Refresh orgs to show new org
                    const res = await api.get('/organizations')
                    const orgs = res.data?.data?.organizations || []
                    setOrgs(orgs)

                    const acceptedOrgId = acceptRes.data?.data?.orgId
                    // Switch to accepted org
                    const newOrg = orgs.find(
                      o => o._id === acceptedOrgId
                    ) || orgs.find(
                      o => o.name === inviteModal.metadata?.orgName
                    )
                    if (newOrg) {
                      dispatch(setActiveOrg(newOrg._id))
                      localStorage.setItem('orbit_last_org_id', newOrg._id)
                    }
                    
                    setInviteModal(null)
                    // Show success toast
                    showToast(`Joined ${inviteModal.metadata?.orgName || 'organization'}!`, 'success')
                    // Navigate to dashboard
                    navigate('/dashboard')
                  } catch (err) {
                    showToast(
                      err.response?.data?.message || 'Failed to accept invitation',
                      'error'
                    )
                  } finally {
                    setAcceptingInvite(false)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: acceptingInvite
                    ? 'not-allowed' : 'pointer',
                  opacity: acceptingInvite ? 0.7 : 1,
                }}>
                {acceptingInvite
                  ? 'Joining...' : 'Accept ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

