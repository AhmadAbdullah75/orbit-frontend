import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setCredentials, setActiveOrg } from '../store/slices/authSlice';
import { logoutAPI } from '../features/auth/authAPI';
import { useTheme } from '../context/ThemeContext';
import api from '../services/axios';
import { getPermissions } from '../utils/permissions';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUp, scaleIn, scaleInRight, EASE } from '../utils/animations';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/activity', label: 'Activity', icon: 'history' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/members', label: 'Members', icon: 'group' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
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
  const [orgs, setOrgs] = useState([])
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
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
  const [orgsLoaded, setOrgsLoaded] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

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
  const activeOrg = orgs.find(o => o._id === activeOrgId);
  const orgDisplayName = activeOrg?.name
    || user?.organization?.name
    || 'My Workspace';
  const orgInitial = orgDisplayName.charAt(0).toUpperCase();
  const userRole = activeOrg?.role || activeOrg?.userRole || 'viewer';
  const perms = getPermissions(userRole);

  // Fetch orgs on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get('/organizations');
        const data = res.data?.data?.organizations || [];
        const sorted = data.sort((a, b) => {
          // Owner's orgs first
          if (a.role === 'owner' && b.role !== 'owner') return -1
          if (b.role === 'owner' && a.role !== 'owner') return 1
          return 0
        })
        setOrgs(sorted);
        setOrgsLoaded(true);

        // Auto-select first org if activeOrgId doesn't exist in the list
        if (activeOrgId) {
          const exists = sorted.find(o => o._id === activeOrgId)
          if (!exists && sorted.length > 0) {
            dispatch(setActiveOrg(sorted[0]._id))
          }
        } else if (sorted.length > 0) {
          const defaultOrg = sorted.find(
            o => o._id === user?.organization?._id
          ) || sorted[0];
          dispatch(setActiveOrg(defaultOrg._id));
        }
      } catch (err) {
        console.error('Fetch orgs error:', err);
        setOrgsLoaded(true);
      }
    };
    fetchOrgs();
  }, [activeOrgId, dispatch, user?.organization?._id]);

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
      await logoutAPI();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  // Fetch notifications (poll every 30s)
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
    // Only fetch if user is authenticated
    if (!user?._id) return

    fetchNotifications()

    // Poll every 30 seconds
    const interval = setInterval(
      fetchNotifications, 30000
    )
    return () => clearInterval(interval)
  }, [user?._id])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
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

  return (
    <div className="flex h-screen overflow-hidden font-sans">

      {/* ── SIDEBAR ── */}
      <aside 
        className="flex flex-col flex-shrink-0 bg-white dark:bg-[#0f0f0f] border-r border-slate-200 dark:border-[rgba(255,255,255,0.06)] z-20 transition-colors duration-150"
        style={{
          width: '240px',
          flexShrink: 0,
          display: window.innerWidth < 768
            ? (mobileMenuOpen ? 'flex' : 'none')
            : 'flex',
          position: window.innerWidth < 768
            ? 'fixed'
            : 'relative',
          zIndex: window.innerWidth < 768 ? 100 : 'auto',
          top: 0,
          left: 0,
          bottom: 0,
        }}
      >

        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6764f2] to-indigo-400 flex items-center justify-center shadow-lg shadow-[#6764f2]/20 flex-shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]">rocket_launch</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Orbit</span>
        </div>

        {/* Org Switcher */}
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
                {orgInitial}
              </div>
              <span className="text-sm font-medium truncate
                               text-slate-700 dark:text-slate-300">
                {orgsLoaded ? orgDisplayName : '...'}
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
                    }}
                    className={`w-full flex items-center gap-2
                               px-3 py-2 rounded-lg text-sm
                               transition-colors text-left
                               ${activeOrgId === org._id
                                 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'
                                 : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                               }`}
                  >
                    <div className="size-6 rounded bg-indigo-600
                                    flex items-center justify-center
                                    text-white text-xs font-bold shrink-0">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{org.name}</span>
                    {activeOrgId === org._id && (
                      <span className="material-symbols-outlined
                                       text-[16px] ml-auto">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100
                              dark:border-[rgba(255,255,255,0.06)] p-2">
                {(orgs.length === 0 || userRole === 'owner') && (
                  <button
                    onClick={() => {
                      setShowOrgDropdown(false);
                      setShowCreateOrgModal(true);
                    }}
                    className="w-full flex items-center gap-2
                               px-3 py-2 rounded-lg text-sm
                               text-slate-500 dark:text-slate-400
                               hover:bg-slate-50 dark:hover:bg-white/5
                               transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                    New Organization
                  </button>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto pt-2">
          {navLinks.map((link) => {
            const isActive = currentPath.pathname === link.to || (link.to !== '/dashboard' && currentPath.pathname.startsWith(link.to));
            return (
            <div key={link.to} className="relative mb-1 px-3">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    left: '12px', right: '12px',
                    borderRadius: '8px',
                    background: isDark ? 'rgba(103,100,242,0.12)' : '#f1f5f9',
                  }}
                  transition={EASE.smoothSpring}
                />
              )}
              <motion.div
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="relative z-10"
              >
                <NavLink
                  to={link.to}
                  className={`flex items-center gap-3 h-9 px-3 rounded-md text-[13.5px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-[#6764f2]'
                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
                  <span>{link.label}</span>
                </NavLink>
              </motion.div>
            </div>
          )})}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-[rgba(255,255,255,0.06)] relative">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
          >
            <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-[rgba(255,255,255,0.1)] bg-[#6764f2] flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                : userInitial}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 truncate leading-tight">{user?.email || ''}</p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-600">more_vert</span>
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

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-30 h-[60px] flex items-center justify-between px-6 lg:px-8 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md border-b border-slate-200 dark:border-[rgba(255,255,255,0.06)] transition-colors duration-150 flex-shrink-0">

          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg"
              style={{
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined"
                style={{
                  color: isDark ? '#e2e8f0' : '#1e293b',
                  fontSize: '20px',
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
                        <div key={notif._id} className={`flex gap-3 px-4 py-3 border-b last:border-0 border-slate-50 dark:border-[rgba(255,255,255,0.04)] transition-colors ${!notif.isRead ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                          <div className="size-8 rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-indigo-100 dark:bg-indigo-900/30">
                            {notif.sender?.avatar
                              ? <img src={notif.sender.avatar} className="w-full h-full object-cover" alt="" />
                              : <span className="text-indigo-600 text-xs font-bold">{notif.sender?.name?.charAt(0) || '?'}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{notif.message}</p>
                            <p className="text-xs mt-1 text-slate-400 dark:text-slate-600">{timeAgo(notif.createdAt)}</p>
                          </div>
                          {!notif.isRead && <div className="size-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />}
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
                        navigate('/settings')
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

                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        navigate('/settings')
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
                      Profile
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
                        try {
                          await api.post('/auth/logout')
                        } catch {}
                        dispatch(logout())
                        navigate('/login')
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
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-around px-2 z-50 transition-colors duration-150">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-150 ${
                isActive ? 'text-[#6764f2]' : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
            <span className="text-[10px] font-bold">{link.label}</span>
          </NavLink>
        ))}
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
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 flex items-center gap-2 border border-transparent"
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
    </div>
  );
}

