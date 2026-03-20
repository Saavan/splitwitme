import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { GroupInvite } from './useInvites'

export interface Group {
  id: string
  name: string
  memberCount: number
  netBalance: number
  createdAt: string
}

export interface GroupDetail {
  id: string
  name: string
  members: Array<{
    id: string
    role: 'OWNER' | 'MEMBER'
    user: {
      id: string
      name: string
      email: string
      avatarUrl: string | null
      venmoHandle: string | null
    }
  }>
  invites: GroupInvite[]
}

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups')
      return res.data
    },
  })
}

export function useGroup(id: string) {
  return useQuery<GroupDetail>({
    queryKey: ['groups', id],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/groups', { name })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useAddMember(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post(`/groups/${groupId}/members`, { email })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  })
}

export function useGroupJoinLink(groupId: string) {
  return useQuery<{ joinUrl: string }>({
    queryKey: ['groups', groupId, 'join-link'],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${groupId}/join-link`)
      return res.data
    },
    enabled: false,
  })
}

export function useRegenerateJoinLink(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{ joinUrl: string }> => {
      const res = await apiClient.post(`/groups/${groupId}/regenerate-join-link`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId, 'join-link'] }),
  })
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/groups/${groupId}/members/${userId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  })
}
