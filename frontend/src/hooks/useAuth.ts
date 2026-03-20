import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  venmoHandle: string | null
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/me')
        return res.data
      } catch {
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
