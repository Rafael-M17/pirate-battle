import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameOptions } from '../game/Game'
import {
  getLeaderboard,
  getMatchHistory,
  matchQueryKeys,
  registerMatch,
  resetDemoData,
} from './matchesApi'
import type { MatchRecord, NetworkScenario } from './contracts'

export function useLeaderboard(
  configuration: GameOptions,
  page: number,
  scenario: NetworkScenario,
  enabled = true
) {
  return useQuery({
    queryKey: matchQueryKeys.leaderboard(configuration, page, scenario),
    queryFn: () => getLeaderboard(configuration, page, scenario),
    enabled,
    staleTime: 15_000,
    retry: 1,
  })
}

export function useMatchHistory(
  playerId: string,
  page: number,
  scenario: NetworkScenario,
  enabled = true
) {
  return useQuery({
    queryKey: matchQueryKeys.history(playerId, page, scenario),
    queryFn: () => getMatchHistory(playerId, page, scenario),
    enabled,
    staleTime: 15_000,
    retry: 1,
  })
}

export function useRegisterMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (match: MatchRecord) => registerMatch(match),
    retry: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: matchQueryKeys.all })
    },
  })
}

export function useResetDemoData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resetDemoData,
    retry: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: matchQueryKeys.all })
    },
  })
}
