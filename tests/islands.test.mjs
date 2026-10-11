import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createIslandLayout,
  findIslandsAlongRoute,
  islandBoundaryRadius,
} from '../src/game/Islands.ts'

const playerRadius = 42
const coastBuffer = 220
const islands = createIslandLayout(3000, 2400)
const mainIslands = islands.filter(island => island.missionIsland)
const islets = islands.filter(island => !island.missionIsland)

test('the real map marks exactly four discoverable main islands', () => {
  assert.equal(mainIslands.length, 4)
  assert.equal(islets.length, 2)

  for (const island of mainIslands) {
    const angle = Math.PI / 4
    const distance = islandBoundaryRadius(island, angle) * 1.12 +
      playerRadius + coastBuffer - 1
    const shipX = island.x + Math.cos(angle) * distance
    const shipY = island.y + Math.sin(angle) * distance

    assert.deepEqual(
      findIslandsAlongRoute(
        islands,
        shipX,
        shipY,
        shipX,
        shipY,
        playerRadius,
        coastBuffer
      ),
      [island]
    )
  }
})

test('discovery uses the travelled segment and ignores the two islets', () => {
  for (const island of islets) {
    const angle = Math.PI / 3
    const coastDistance = islandBoundaryRadius(island, angle) * 1.12
    const outsideDistance = coastDistance + playerRadius + coastBuffer + 80
    const insideDistance = coastDistance + playerRadius + coastBuffer - 20
    const startX = island.x + Math.cos(angle) * outsideDistance
    const startY = island.y + Math.sin(angle) * outsideDistance
    const endX = island.x + Math.cos(angle) * insideDistance
    const endY = island.y + Math.sin(angle) * insideDistance

    assert.deepEqual(
      findIslandsAlongRoute(
        islands,
        startX,
        startY,
        endX,
        endY,
        playerRadius,
        coastBuffer
      ),
      []
    )
  }

  const island = mainIslands[0]
  const angle = Math.PI / 5
  const distance = islandBoundaryRadius(island, angle) * 1.12 +
    playerRadius + coastBuffer - 10
  const startX = island.x + Math.cos(angle) * (distance + 90)
  const startY = island.y + Math.sin(angle) * (distance + 90)
  const endX = island.x + Math.cos(angle) * distance
  const endY = island.y + Math.sin(angle) * distance

  assert.deepEqual(
    findIslandsAlongRoute(
      islands,
      startX,
      startY,
      endX,
      endY,
      playerRadius,
      coastBuffer
    ),
    [island]
  )
})

test('a discovered main island cannot be counted again', () => {
  const island = mainIslands[0]
  island.discovered = true
  const shipX = island.x
  const shipY = island.y

  assert.deepEqual(
    findIslandsAlongRoute(
      islands,
      shipX,
      shipY,
      shipX,
      shipY,
      playerRadius,
      coastBuffer
    ),
    []
  )
})
