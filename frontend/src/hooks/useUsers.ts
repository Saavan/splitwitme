import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface UserSearchResult {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export function useUserSearch(q: string, excludeGroupId?: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q, excludeGroupId],
    queryFn: async () => {
      const params = new URLSearchParams({ q })
      if (excludeGroupId) params.set('excludeGroupId', excludeGroupId)
      const res = await apiClient.get(`/users/search?${params}`)
      return res.data
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}
