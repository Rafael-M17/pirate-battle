import type { GameEndReason } from '../game/GameRules'
import type { GameOptions } from '../game/Game'

export type MatchRecord = {
  matchId: string
  playerId: string
  playerName: string
  completedAt: string
  score: number
  durationSeconds: number
  endReason: GameEndReason
  configuration: GameOptions
}

export type LeaderboardEntry = MatchRecord & {
  rank: number
}

export type PageResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'out-of-order'
  | 'ranking-error'
  | 'history-error'
  | 'network-error'
  | 'registration-timeout'
  | 'registration-unavailable'

export const NETWORK_SCENARIOS: Array<{
  value: NetworkScenario
  label: string
}> = [
  { value: 'success', label: 'SUCCESS' },
  { value: 'empty', label: 'EMPTY LISTS' },
  { value: 'slow', label: 'SLOW NETWORK' },
  { value: 'out-of-order', label: 'OUT-OF-ORDER PAGES' },
  { value: 'ranking-error', label: 'RANKING ERROR' },
  { value: 'history-error', label: 'HISTORY ERROR' },
  { value: 'network-error', label: 'NETWORK FAILURE' },
  { value: 'registration-timeout', label: 'REGISTER THEN TIMEOUT' },
  { value: 'registration-unavailable', label: 'REGISTRATION UNAVAILABLE' },
]
