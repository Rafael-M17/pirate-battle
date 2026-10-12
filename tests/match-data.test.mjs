import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FIXTURE_MATCHES,
  insertMatchOnce,
  paginate,
  sameConfiguration,
  sortHistory,
  sortLeaderboard,
} from '../src/api/matchData.ts'

const defaultConfiguration = { matchDuration: 180, spawnInterval: 5 }

test('leaderboard sorts by score, then faster completion, then stable identifiers', () => {
  const entries = sortLeaderboard(FIXTURE_MATCHES.filter(match =>
    sameConfiguration(match.configuration, defaultConfiguration)
  ))

  assert.equal(entries[0].score, 18)
  assert.equal(entries[0].matchId, 'fixture-002')
  assert.equal(entries[1].matchId, 'fixture-001')
  assert.equal(entries.every(entry => sameConfiguration(entry.configuration, defaultConfiguration)), true)
  assert.deepEqual(entries.map(entry => entry.rank), entries.map((_, index) => index + 1))
})

test('history sorts newest first and pagination reports stable metadata', () => {
  const history = sortHistory(FIXTURE_MATCHES.filter(match => match.playerId === 'player-fixture-01'))
  assert.equal(history.length, 1)
  assert.equal(history[0].matchId, 'fixture-001')

  const firstPage = paginate(FIXTURE_MATCHES, 1, 5)
  const secondPage = paginate(FIXTURE_MATCHES, 2, 5)
  assert.equal(firstPage.totalItems, 11)
  assert.equal(firstPage.totalPages, 3)
  assert.equal(firstPage.items.length, 5)
  assert.equal(secondPage.items.length, 5)
  assert.notEqual(firstPage.items[0].matchId, secondPage.items[0].matchId)
})

test('inserting a repeated matchId is idempotent', () => {
  const match = FIXTURE_MATCHES[0]
  const first = insertMatchOnce([], match)
  const repeated = insertMatchOnce(first.matches, { ...match, score: 999 })

  assert.equal(first.inserted, true)
  assert.equal(repeated.inserted, false)
  assert.equal(repeated.matches.length, 1)
  assert.equal(repeated.record.score, match.score)
})
