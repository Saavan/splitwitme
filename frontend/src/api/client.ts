import axios from 'axios'

const apiClient = axios.create({
  // In local dev VITE_API_URL points to the backend directly (e.g. http://localhost:3001).
  // In production it is unset, so we use /api which Vercel proxies to the backend,
  // keeping /groups/:id etc. free for SPA page refreshes.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

export default apiClient
