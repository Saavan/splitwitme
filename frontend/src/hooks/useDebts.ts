import { useQuery } from '@tanstack/react-query'
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
  venmoLink: string | null
}

export interface DebtsData {
  rawBalances: RawBalance[]
  simplifiedDebts: SimplifiedDebt[]
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
