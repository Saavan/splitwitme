import axios from 'axios'

const apiClient = axios.create({
  // In local dev VITE_API_URL points to the backend directly (e.g. http://localhost:3001).
  // In production it is unset, so we use /api which Vercel proxies to the backend,
  // keeping /groups/:id etc. free for SPA page refreshes.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if not on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
