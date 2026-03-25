import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface UserSearchResult {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isMember: boolean
}

export function useUserSearch(q: string, groupId?: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q, groupId],
    queryFn: async () => {
      const params = new URLSearchParams({ q })
      if (groupId) params.set('groupId', groupId)
      const res = await apiClient.get(`/users/search?${params}`)
      return res.data
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}
