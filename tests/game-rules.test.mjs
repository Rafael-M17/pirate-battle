import assert from 'node:assert/strict'
import test from 'node:test'
import { getGameEndReason } from '../src/game/GameRules.ts'

test('time ending is selected when the active session reaches its duration', () => {
  assert.equal(getGameEndReason(100, 179.99, 180), null)
  assert.equal(getGameEndReason(100, 180, 180), 'time-up')
})

test('ship destruction is selected when health reaches zero', () => {
  assert.equal(getGameEndReason(1, 40, 180), null)
  assert.equal(getGameEndReason(0, 40, 180), 'game-over')
})

test('health reaching zero takes precedence if both end conditions coincide', () => {
  assert.equal(getGameEndReason(0, 180, 180), 'game-over')
})
