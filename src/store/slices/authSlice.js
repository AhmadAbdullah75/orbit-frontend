import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    activeOrgId: localStorage.getItem('activeOrgId') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, token } = action.payload;
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
            state.error = null;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);
        },
  logout: (state) => {
    // Save last org for when user logs back in
    if (state.activeOrgId) {
      localStorage.setItem(
        'orbit_last_org_id', state.activeOrgId
      )
    }

    // Clear all auth state
    state.user = null
    state.token = null
    state.activeOrgId = null
    state.isAuthenticated = false

    // Clear all localStorage keys
    const keysToRemove = [
      'token', 'activeOrgId',
      'user',
      'auth',
      'orbit_orgs_cache',
      'orbit_notification_prefs',
    ]
    keysToRemove.forEach(key =>
      localStorage.removeItem(key)
    )

    // Clear redux-persist if used
    try {
      localStorage.removeItem('persist:auth')
      localStorage.removeItem('persist:root')
    } catch {}
  },
        setActiveOrg: (state, action) => {
            state.activeOrgId = action.payload;
            localStorage.setItem('activeOrgId', action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
    },
});

export const { setCredentials, logout, setLoading, setError, setActiveOrg } = authSlice.actions;
export default authSlice.reducer;
