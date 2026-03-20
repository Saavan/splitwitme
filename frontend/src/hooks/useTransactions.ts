import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface TransactionSplit {
  id: string
  userId: string
  amount: string
  user: { id: string; name: string }
}

export interface Transaction {
  id: string
  groupId: string
  description: string
  amount: string
  currency: string
  date: string
  paidById: string
  paidBy: { id: string; name: string; avatarUrl: string | null }
  splits: TransactionSplit[]
}

export interface CreateTransactionInput {
  description: string
  amount: number
  currency: string
  date?: string
  paidById: string
  splits: { userId: string; amount: number }[]
}

export function useTransactions(groupId: string) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', groupId],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${groupId}/transactions`)
      return res.data
    },
    enabled: !!groupId,
  })
}

export function useCreateTransaction(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const res = await apiClient.post(`/groups/${groupId}/transactions`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', groupId] })
      qc.invalidateQueries({ queryKey: ['debts', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUpdateTransaction(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ txId, data }: { txId: string; data: CreateTransactionInput }) => {
      const res = await apiClient.patch(`/groups/${groupId}/transactions/${txId}`, data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', groupId] })
      qc.invalidateQueries({ queryKey: ['debts', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useDeleteTransaction(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (txId: string) => {
      await apiClient.delete(`/groups/${groupId}/transactions/${txId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', groupId] })
      qc.invalidateQueries({ queryKey: ['debts', groupId] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
