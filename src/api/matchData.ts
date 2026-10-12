import type { GameOptions } from '../game/Game'
import type { GameResult } from '../game/Game'
import type { LeaderboardEntry, MatchRecord, PageResponse } from './contracts'

export const FIXTURE_MATCHES: MatchRecord[] = [
  { matchId: 'fixture-001', playerId: 'player-fixture-01', playerName: 'CAPTAIN MARLOW', completedAt: '2025-01-11T10:20:00.000Z', score: 18, durationSeconds: 180, endReason: 'time-up', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-002', playerId: 'player-fixture-02', playerName: 'BLUE HORIZON', completedAt: '2025-01-12T09:10:00.000Z', score: 18, durationSeconds: 142, endReason: 'game-over', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-003', playerId: 'player-fixture-03', playerName: 'IRON KRAKEN', completedAt: '2025-01-13T12:30:00.000Z', score: 15, durationSeconds: 180, endReason: 'time-up', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-004', playerId: 'player-fixture-04', playerName: 'SEA WITCH', completedAt: '2025-01-14T15:45:00.000Z', score: 12, durationSeconds: 91, endReason: 'game-over', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-005', playerId: 'player-fixture-05', playerName: 'GOLDEN CUTLASS', completedAt: '2025-01-15T08:00:00.000Z', score: 10, durationSeconds: 60, endReason: 'time-up', configuration: { matchDuration: 60, spawnInterval: 3 } },
  { matchId: 'fixture-006', playerId: 'player-fixture-06', playerName: 'NORTH STAR', completedAt: '2025-01-16T17:20:00.000Z', score: 8, durationSeconds: 180, endReason: 'time-up', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-007', playerId: 'player-fixture-07', playerName: 'BLACK TIDE', completedAt: '2025-01-17T13:05:00.000Z', score: 7, durationSeconds: 53, endReason: 'game-over', configuration: { matchDuration: 60, spawnInterval: 3 } },
  { matchId: 'fixture-008', playerId: 'player-fixture-08', playerName: 'CORAL REAVER', completedAt: '2025-01-18T11:15:00.000Z', score: 5, durationSeconds: 180, endReason: 'time-up', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-009', playerId: 'player-fixture-09', playerName: 'STORM PETREL', completedAt: '2025-01-19T16:40:00.000Z', score: 3, durationSeconds: 37, endReason: 'game-over', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-010', playerId: 'player-fixture-10', playerName: 'RED ENSIGN', completedAt: '2025-01-20T07:25:00.000Z', score: 1, durationSeconds: 180, endReason: 'time-up', configuration: { matchDuration: 180, spawnInterval: 5 } },
  { matchId: 'fixture-011', playerId: 'player-fixture-11', playerName: 'TIDEMARK', completedAt: '2025-01-21T14:00:00.000Z', score: 0, durationSeconds: 60, endReason: 'time-up', configuration: { matchDuration: 60, spawnInterval: 3 } },
]

export function createMatchRecord(
  result: GameResult,
  playerId: string,
  playerName: string
): MatchRecord {
  return {
    matchId: result.matchId,
    playerId,
    playerName,
    completedAt: result.completedAt,
    score: result.score,
    durationSeconds: result.survivedSeconds,
    endReason: result.outcome,
    configuration: { ...result.configuration },
  }
}

export function normalizePlayerName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ')
  return name.length >= 2 && name.length <= 24 ? name : ''
}

export function sameConfiguration(left: GameOptions, right: GameOptions) {
  return left.matchDuration === right.matchDuration &&
    left.spawnInterval === right.spawnInterval
}

export function sortLeaderboard(matches: MatchRecord[]): LeaderboardEntry[] {
  return [...matches]
    .sort((left, right) =>
      right.score - left.score ||
      left.durationSeconds - right.durationSeconds ||
      left.completedAt.localeCompare(right.completedAt) ||
      left.matchId.localeCompare(right.matchId)
    )
    .map((match, index) => ({ ...match, rank: index + 1 }))
}

export function sortHistory(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt) ||
    left.matchId.localeCompare(right.matchId)
  )
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageResponse<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const safePage = Math.min(totalPages, Math.max(1, Math.floor(page)))
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  }
}

export function insertMatchOnce(matches: MatchRecord[], match: MatchRecord) {
  const existing = matches.find(item => item.matchId === match.matchId)
  if (existing) return { matches, record: existing, inserted: false }

  const updated = [...matches, match]
  return { matches: updated, record: match, inserted: true }
}
