import axios from 'axios'

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

// Response interceptor — handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message
      ?.toLowerCase() || ''

    const isAuthError =
      status === 401 ||
      message.includes('jwt expired') ||
      message.includes('invalid token') ||
      message.includes('unauthorized') ||
      message.includes('token') ||
      status === 403

    if (isAuthError) {
      // Clear all auth data
      localStorage.removeItem('token')
      localStorage.removeItem('auth')
      localStorage.removeItem('activeOrgId')
      localStorage.removeItem('user')

      // Redirect to login
      // Use window.location to force full reload
      // and clear React state
      if (!window.location.pathname
            .includes('/login') &&
          !window.location.pathname
            .includes('/register')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
