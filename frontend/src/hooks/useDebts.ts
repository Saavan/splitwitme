import { useQuery, useMutation } from '@tanstack/react-query'
import apiClient from '@/api/client'

export interface RawBalance {
  userId: string
  name: string
  balance: number
}

export interface SimplifiedDebt {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
  currency: string
  venmoLink: string | null
}

export interface CurrencyDebts {
  rawBalances: RawBalance[]
  simplifiedDebts: SimplifiedDebt[]
}

export interface DebtsData {
  perCurrency: Record<string, CurrencyDebts>
}

export type ReminderLevel = 'friendly' | 'medium' | 'angry'

export function useSendReminder(groupId: string) {
  return useMutation({
    mutationFn: async (data: { debtorUserId: string; amount: number; currency: string; level: ReminderLevel }) => {
      const res = await apiClient.post(`/groups/${groupId}/debts/remind`, data)
      return res.data
    },
  })
}

export function useDebts(groupId: string) {
  return useQuery<DebtsData>({
    queryKey: ['debts', groupId],
    queryFn: async () => {
      const res = await apiClient.get(`/groups/${groupId}/debts`)
      return res.data
    },
    enabled: !!groupId,
  })
}
