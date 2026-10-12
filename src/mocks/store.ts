import {
  LAST_RESULT_STORAGE_KEY,
  MATCHES_STORAGE_KEY,
  MOCK_SCENARIO_STORAGE_KEY,
  PENDING_MATCHES_STORAGE_KEY,
  PLAYER_ID_STORAGE_KEY,
  PLAYER_NAME_STORAGE_KEY,
  REGISTERED_MATCHES_STORAGE_KEY,
  TIMEOUT_MATCHES_STORAGE_KEY,
} from '../api/clientStorage'
import type { MatchRecord, NetworkScenario } from '../api/contracts'

export function readMockMatches(): MatchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(MATCHES_STORAGE_KEY) ?? '[]') as MatchRecord[]
  } catch {
    return []
  }
}

export function writeMockMatches(matches: MatchRecord[]) {
  localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches))
}

export function readMockScenario(): NetworkScenario {
  try {
    const scenario = JSON.parse(
      localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY) ?? '"success"'
    ) as NetworkScenario
    return [
      'success',
      'empty',
      'slow',
      'out-of-order',
      'ranking-error',
      'history-error',
      'network-error',
      'registration-timeout',
      'registration-unavailable',
    ].includes(scenario) ? scenario : 'success'
  } catch {
    return 'success'
  }
}

export function hasRegistrationTimedOut(matchId: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(TIMEOUT_MATCHES_STORAGE_KEY) ?? '[]') as string[]
    return ids.includes(matchId)
  } catch {
    return false
  }
}

export function markRegistrationTimedOut(matchId: string) {
  const ids = new Set<string>()
  try {
    for (const id of JSON.parse(localStorage.getItem(TIMEOUT_MATCHES_STORAGE_KEY) ?? '[]') as string[]) {
      ids.add(id)
    }
  } catch {
    // Start with an empty timeout ledger if storage data is malformed.
  }
  ids.add(matchId)
  localStorage.setItem(TIMEOUT_MATCHES_STORAGE_KEY, JSON.stringify([...ids]))
}

export function resetMockStorage() {
  for (const key of [
    MATCHES_STORAGE_KEY,
    PENDING_MATCHES_STORAGE_KEY,
    TIMEOUT_MATCHES_STORAGE_KEY,
    LAST_RESULT_STORAGE_KEY,
    PLAYER_ID_STORAGE_KEY,
    PLAYER_NAME_STORAGE_KEY,
    REGISTERED_MATCHES_STORAGE_KEY,
  ]) {
    localStorage.removeItem(key)
  }
}
