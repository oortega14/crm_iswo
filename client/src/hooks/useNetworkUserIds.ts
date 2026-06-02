import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { queryKeys } from '@/lib/queryClient'

interface NetworkEdge {
  referred_id: number
  referrer_id: number
  depth: number
}

interface MyNetworkPayload {
  root: { id: number } | null
  edges: NetworkEdge[]
}

/**
 * Devuelve el Set de IDs (string) de los usuarios referidos en la red del
 * usuario actual (profundidad = network_depth del tenant vía my_network).
 * Usa React Query: todos los componentes que llamen al hook comparten caché.
 */
export function useNetworkUserIds(): Set<string> {
  const { data } = useQuery<MyNetworkPayload>({
    queryKey: queryKeys.referralNetworks.myNetwork,
    queryFn: async () => {
      const res = await api.get<{ data: MyNetworkPayload }>('/referral_networks/my_network')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  return useMemo(() => {
    const ids = new Set<string>()
    data?.edges?.forEach((e) => ids.add(String(e.referred_id)))
    return ids
  }, [data])
}
