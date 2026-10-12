import { delay, http, HttpResponse } from 'msw'
import type { GameOptions } from '../game/Game'
import type { MatchRecord, NetworkScenario, PageResponse } from '../api/contracts'
import {
  FIXTURE_MATCHES,
  insertMatchOnce,
  paginate,
  sameConfiguration,
  sortHistory,
  sortLeaderboard,
} from '../api/matchData'
import {
  hasRegistrationTimedOut,
  markRegistrationTimedOut,
  readMockMatches,
  readMockScenario,
  resetMockStorage,
  writeMockMatches,
} from './store'

const DEFAULT_PAGE_SIZE = 5

async function applyReadScenario(
  scenario: NetworkScenario,
  resource: 'ranking' | 'history',
  page: number
) {
  if (scenario === 'network-error') return HttpResponse.error()
  if (scenario === `${resource}-error`) {
    return HttpResponse.json({ error: `${resource} is temporarily unavailable` }, { status: 503 })
  }
  if (scenario === 'slow') await delay(700 + (page % 3) * 300)
  if (scenario === 'out-of-order') {
    await delay(page === 1 ? 900 : 80)
  }
  return null
}

function emptyPage<T>(page: number, pageSize: number): PageResponse<T> {
  return { items: [], page, pageSize, totalItems: 0, totalPages: 1 }
}

export const handlers = [
  http.get('/api/leaderboard', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(20, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const scenario = readMockScenario()
    const failure = await applyReadScenario(scenario, 'ranking', page)
    if (failure) return failure
    if (scenario === 'empty') return HttpResponse.json(emptyPage(page, pageSize))

    const configuration: GameOptions = {
      matchDuration: Math.max(60, Number(url.searchParams.get('matchDuration')) || 180),
      spawnInterval: Math.max(0.5, Number(url.searchParams.get('spawnInterval')) || 5),
    }
    const matches = [...FIXTURE_MATCHES, ...readMockMatches()]
      .filter(match => sameConfiguration(match.configuration, configuration))
    return HttpResponse.json(paginate(sortLeaderboard(matches), page, pageSize))
  }),

  http.get('/api/matches', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(20, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const playerId = url.searchParams.get('playerId') ?? ''
    const scenario = readMockScenario()
    const failure = await applyReadScenario(scenario, 'history', page)
    if (failure) return failure
    if (scenario === 'empty') return HttpResponse.json(emptyPage(page, pageSize))

    const matches = readMockMatches().filter(match => match.playerId === playerId)
    return HttpResponse.json(paginate(sortHistory(matches), page, pageSize))
  }),

  http.post('/api/matches', async ({ request }) => {
    const match = await request.json() as MatchRecord
    const idempotencyKey = request.headers.get('Idempotency-Key')

    if (!match?.matchId || !match.playerId || !match.playerName || idempotencyKey !== match.matchId) {
      return HttpResponse.json({ error: 'Invalid match record or idempotency key' }, { status: 400 })
    }
    if (!Number.isFinite(match.score) || match.score < 0 || !Number.isFinite(match.durationSeconds) || match.durationSeconds < 0) {
      return HttpResponse.json({ error: 'Invalid score or duration' }, { status: 422 })
    }

    const current = readMockMatches()
    const existing = current.find(record => record.matchId === match.matchId)
    if (existing) return HttpResponse.json(existing)

    const scenario = readMockScenario()
    if (scenario === 'network-error') return HttpResponse.error()
    if (scenario === 'registration-unavailable') {
      return HttpResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 })
    }

    const inserted = insertMatchOnce(current, match)
    writeMockMatches(inserted.matches)

    if (scenario === 'registration-timeout' && !hasRegistrationTimedOut(match.matchId)) {
      markRegistrationTimedOut(match.matchId)
      return HttpResponse.json({ error: 'The response timed out after the match was saved' }, { status: 504 })
    }

    return HttpResponse.json(inserted.record, { status: 201 })
  }),

  http.post('/api/reset', () => {
    resetMockStorage()
    localStorage.setItem('pirate-battle-mock-scenario', 'success')
    return HttpResponse.json({ reset: true })
  }),
]
