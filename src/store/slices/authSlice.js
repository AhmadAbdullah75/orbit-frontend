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
        loginSuccess: (state, action) => {
            const { token, user } = action.payload;
            state.token = token;
            state.user = user;      // ← user includes avatar
            state.isAuthenticated = true;
            localStorage.setItem('token', token);
        },
        updateUser: (state, action) => {
            state.user = { ...state.user, ...action.payload };
            localStorage.setItem('user', JSON.stringify(state.user));
        },
  logout: (state) => {
    // Save current org BEFORE clearing
    if (state.activeOrgId) {
      localStorage.setItem(
        'orbit_last_org_id',
        state.activeOrgId
      )
      console.log(
        '[Logout] Saved org:',
        state.activeOrgId
      )
    }

    state.user = null
    state.token = null
    state.activeOrgId = null
    state.isAuthenticated = false
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

export const { setCredentials, loginSuccess, updateUser, logout, setLoading, setError, setActiveOrg } = authSlice.actions;
export default authSlice.reducer;
