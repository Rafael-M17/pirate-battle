import type { GameOptions } from '../game/Game'
import type { MatchRecord, NetworkScenario, PageResponse, LeaderboardEntry } from './contracts'
import { apiClient } from './http'
import {
  getMockScenario,
  getPendingMatches,
  queuePendingMatch,
  removePendingMatch,
  saveMockScenario,
  savePendingMatches,
} from './clientStorage'

export const MATCH_PAGE_SIZE = 5
export const matchQueryKeys = {
  all: ['matches'] as const,
  leaderboard: (configuration: GameOptions, page: number, scenario: NetworkScenario) =>
    ['matches', 'leaderboard', configuration.matchDuration, configuration.spawnInterval, page, scenario] as const,
  history: (playerId: string, page: number, scenario: NetworkScenario) =>
    ['matches', 'history', playerId, page, scenario] as const,
}

export async function getLeaderboard(
  configuration: GameOptions,
  page: number,
  scenario = getMockScenario()
) {
  const response = await apiClient.get<PageResponse<LeaderboardEntry>>('/leaderboard', {
    params: { matchDuration: configuration.matchDuration, spawnInterval: configuration.spawnInterval, page, pageSize: MATCH_PAGE_SIZE, scenario },
  })
  return response.data
}

export async function getMatchHistory(playerId: string, page: number, scenario = getMockScenario()) {
  const response = await apiClient.get<PageResponse<MatchRecord>>('/matches', {
    params: { playerId, page, pageSize: MATCH_PAGE_SIZE, scenario },
  })
  return response.data
}

export async function registerMatch(match: MatchRecord) {
  queuePendingMatch(match)
  const response = await apiClient.post<MatchRecord>('/matches', match, {
    headers: { 'Idempotency-Key': match.matchId },
  })
  removePendingMatch(match.matchId)
  return response.data
}

export async function retryPendingMatches() {
  const pending = getPendingMatches()
  const settled = await Promise.allSettled(pending.map(registerMatch))
  return settled
}

export async function resetDemoData() {
  await apiClient.post('/reset')
  saveMockScenario('success')
  savePendingMatches([])
}
