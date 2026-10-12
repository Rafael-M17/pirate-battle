import type { MatchRecord, NetworkScenario } from './contracts'
import type { GameResult } from '../game/Game'

export const PLAYER_ID_STORAGE_KEY = 'pirate-battle-player-id'
export const PLAYER_NAME_STORAGE_KEY = 'pirate-battle-player-name'
export const LAST_RESULT_STORAGE_KEY = 'pirate-battle-last-result'
export const PENDING_MATCHES_STORAGE_KEY = 'pirate-battle-pending-matches'
export const MATCHES_STORAGE_KEY = 'pirate-battle-matches'
export const MOCK_SCENARIO_STORAGE_KEY = 'pirate-battle-mock-scenario'
export const TIMEOUT_MATCHES_STORAGE_KEY = 'pirate-battle-timeout-matches'
export const REGISTERED_MATCHES_STORAGE_KEY = 'pirate-battle-registered-matches'

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // API handlers still serve fixtures if browser storage is unavailable.
  }
}

export function getPlayerId() {
  let playerId = readJson<string | null>(PLAYER_ID_STORAGE_KEY, null)
  if (!playerId) {
    playerId = `player-${crypto.randomUUID()}`
    writeJson(PLAYER_ID_STORAGE_KEY, playerId)
  }
  return playerId
}

export function getPlayerName() {
  return readJson<string>(PLAYER_NAME_STORAGE_KEY, '')
}

export function savePlayerName(name: string) {
  writeJson(PLAYER_NAME_STORAGE_KEY, name)
}

export function getLastResult(): GameResult | null {
  return readJson<GameResult | null>(LAST_RESULT_STORAGE_KEY, null)
}

export function saveLastResult(result: GameResult) {
  writeJson(LAST_RESULT_STORAGE_KEY, result)
}

export function getRegisteredMatchIds() {
  return readJson<string[]>(REGISTERED_MATCHES_STORAGE_KEY, [])
}

export function markMatchRegistered(matchId: string) {
  const ids = new Set(getRegisteredMatchIds())
  ids.add(matchId)
  writeJson(REGISTERED_MATCHES_STORAGE_KEY, [...ids])
}

export function getPendingMatches(): MatchRecord[] {
  return readJson<MatchRecord[]>(PENDING_MATCHES_STORAGE_KEY, [])
}

export function savePendingMatches(matches: MatchRecord[]) {
  writeJson(PENDING_MATCHES_STORAGE_KEY, matches)
}

export function queuePendingMatch(match: MatchRecord) {
  const pending = getPendingMatches()
  if (!pending.some(item => item.matchId === match.matchId)) {
    savePendingMatches([...pending, match])
  }
}

export function removePendingMatch(matchId: string) {
  savePendingMatches(getPendingMatches().filter(match => match.matchId !== matchId))
}

export function getMockScenario(): NetworkScenario {
  return readJson<NetworkScenario>(MOCK_SCENARIO_STORAGE_KEY, 'success')
}

export function saveMockScenario(scenario: NetworkScenario) {
  writeJson(MOCK_SCENARIO_STORAGE_KEY, scenario)
}

export function resetClientMatchData() {
  for (const key of [
    LAST_RESULT_STORAGE_KEY,
    PENDING_MATCHES_STORAGE_KEY,
    REGISTERED_MATCHES_STORAGE_KEY,
  ]) {
    localStorage.removeItem(key)
  }
}
