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

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') ||
      (() => {
        try {
          const auth = JSON.parse(
            localStorage.getItem('auth') || '{}'
          )
          return auth?.token
        } catch { return null }
      })()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // Token expired — auto logout
    if (status === 401) {
      const msg = error.response?.data?.message
      if (msg?.includes('expired') ||
          msg?.includes('invalid token')) {
        store.dispatch(logout())
        window.location.href = '/login'
      }
    }

    // Server down
    if (status >= 500) {
      console.error(
        'Server error:',
        error.response?.data?.message
      )
    }

    // Network error (Railway sleeping)
    if (!error.response) {
      console.warn(
        'Network error — server may be waking up'
      )
    }

    return Promise.reject(error)
  }
)

export default api
