import axios from 'axios'
import store from '../store'
import { logout } from '../store/slices/authSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api',
  headers: {
    'Cache-Control': 'no-cache',
  },
})

let isRefreshing = false

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — complete error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || ''

    // 401 — Unauthorized / token expired
    if (status === 401) {
      if (!isRefreshing) {
        isRefreshing = true
        store.dispatch(logout())
        localStorage.clear()
        window.location.replace('/login')
      }
      return Promise.reject(error)
    }

    // 403 — Forbidden / no permission
    if (status === 403) {
      console.warn('Permission denied:', message)
      // Don't crash — let component handle
      return Promise.reject(error)
    }

    // 404 — Not found
    if (status === 404) {
      // Don't crash — let component handle
      return Promise.reject(error)
    }

    // 429 — Rate limit exceeded
    if (status === 429) {
      error.userMessage =
        'Too many requests. Please wait a moment.'
      return Promise.reject(error)
    }

    // 500+ — Server error
    if (status >= 500) {
      error.userMessage =
        'Server error. Please try again shortly.'
      console.error('Server error:', message)
      return Promise.reject(error)
    }

    // Network error — server may be sleeping
    if (!error.response) {
      error.userMessage =
        'Connection failed. ' +
        'The server may be starting up. ' +
        'Please wait 30 seconds and retry.'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
