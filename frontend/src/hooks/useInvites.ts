import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface GroupInvite {
  id: string
  invitedName: string
  email: string | null
  token: string
  createdAt: string
  expiresAt: string | null
}

export interface CreateInviteResult {
  token: string
  inviteUrl: string
  emailSent: boolean
}

export interface InviteInfo {
  groupName: string
  groupId: string
  invitedName: string
  claimed: boolean
}

export function useCreateInvite(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { invitedName: string; email?: string }): Promise<CreateInviteResult> => {
      const res = await apiClient.post(`/groups/${groupId}/invites`, data)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  })
}

export function useInviteInfo(token: string) {
  return useQuery<InviteInfo>({
    queryKey: ['invite', token],
    queryFn: async () => {
      const res = await apiClient.get(`/invites/${token}`)
      return res.data
    },
    enabled: !!token,
    retry: false,
  })
}

export function useClaimInvite(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{ groupId: string }> => {
      const res = await apiClient.post(`/invites/${token}/claim`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useDeleteInvite(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await apiClient.delete(`/groups/${groupId}/invites/${inviteId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  })
}

export function useJoinViaCode(joinCode: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{ groupId: string }> => {
      const res = await apiClient.post(`/invites/join/${joinCode}/join`)
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}
