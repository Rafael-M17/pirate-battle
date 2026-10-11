
import {
  Assets,
  Container,
  Graphics,
  Sprite,
  TilingSprite,
  type Texture,
} from 'pixi.js'

export type IslandStyle = 'tropical' | 'rocky' | 'wreck' | 'fortified'

export type IslandCannon = {
  x: number
  y: number
  sprite: Sprite
  baseAngle: number
  cooldown: number
}

export type Island = {
  x: number
  y: number
  radius: number
  phase: number
  style: IslandStyle
  cannons: IslandCannon[]
}

export function islandBoundaryRadius(
  island: Island,
  angle: number
): number {
  const styleShape = island.style === 'rocky'
    ? 0.045 * Math.cos(angle * 4 + island.phase * 1.4)
    : island.style === 'fortified'
      ? 0.035 * Math.cos(angle * 6 + island.phase)
      : island.style === 'wreck'
        ? 0.03 * Math.sin(angle * 2 - island.phase)
        : 0.025 * Math.sin(angle * 5 + island.phase * 0.8)

  return island.radius * (
    1 +
    0.075 * Math.sin(angle * 3 + island.phase) +
    0.045 * Math.sin(angle * 5 - island.phase * 0.7) +
    0.025 * Math.cos(angle * 7 + island.phase * 1.3) +
    styleShape
  )
}

export class Islands {
  private container = new Container()
  private obstacles: Island[] = []

  async create(width: number, height: number) {
    const base = '/assets/png/default/tiles/'

    const [sand, rock, plants, wreckHull, wood, cannonTexture] = await Promise.all([
      Assets.load<Texture>(base + 'tile_4.png'),
      Assets.load<Texture>(base + 'tile_50.png'),
      Assets.load<Texture>(base + 'tile_71.png'),
      Assets.load<Texture>('/assets/png/default/ship_parts/hull_large_1.png'),
      Assets.load<Texture>('/assets/png/default/ship_parts/wood_1.png'),
      Assets.load<Texture>('/assets/png/default/ship_parts/cannon_mobile.png'),
    ])

    const positions: Array<{
      x: number
      y: number
      radius: number
      style: IslandStyle
    }> = [
      { x: 0.13, y: 0.17, radius: 154, style: 'tropical' },
      { x: 0.86, y: 0.17, radius: 170, style: 'rocky' },
      { x: 0.13, y: 0.83, radius: 142, style: 'wreck' },
      { x: 0.87, y: 0.83, radius: 172, style: 'fortified' },
      { x: 0.5, y: 0.12, radius: 52, style: 'rocky' },
      { x: 0.5, y: 0.88, radius: 48, style: 'tropical' },
    ]

    for (const [index, position] of positions.entries()) {
      const x = position.x * width
      const y = position.y * height
      const radius = position.radius
      const obstacle: Island = {
        x,
        y,
        radius,
        phase: index * 1.7 + 0.4,
        style: position.style,
        cannons: [],
      }

      const island = new Container()
      island.position.set(x, y)

      const palette = {
        tropical: { shore: 0x5ba88e, sand: 0xf1d99f },
        rocky: { shore: 0x7f998e, sand: 0xc9c2a3 },
        wreck: { shore: 0x6f9f9a, sand: 0xd9c394 },
        fortified: { shore: 0x667f72, sand: 0xd3c190 },
      }[position.style]

      const shoal = new Graphics()
      this.traceContour(shoal, obstacle, 1.24)
      shoal.fill({ color: palette.shore, alpha: 0.56 })
      this.traceContour(shoal, obstacle, 1.12)
      shoal.fill({ color: palette.sand, alpha: 0.92 })
      island.addChild(shoal)

      const mask = new Graphics()
      this.traceContour(mask, obstacle)
      mask.fill({ color: '#ffffff' })

      const sandSprite = new TilingSprite({
        texture: sand,
        width: position.radius * 2.2,
        height: position.radius * 2.2,
      })
      sandSprite.anchor.set(0.5)
      sandSprite.tileScale.set(0.82)
      sandSprite.mask = mask
      island.addChild(sandSprite)
      island.addChild(mask)

      const shore = new Graphics()
      this.traceContour(shore, obstacle, 1.025)
      shore.stroke({ color: palette.sand, alpha: 0.9, width: 3 })
      island.addChild(shore)

      const featureOffsets = [
        { x: -0.34, y: -0.22 },
        { x: 0.28, y: -0.3 },
        { x: 0.12, y: 0.26 },
        { x: -0.27, y: 0.31 },
        { x: 0.36, y: 0.12 },
      ]
      const detailScale = Math.min(1, radius / 145)

      if (position.style === 'tropical') {
        for (const [featureIndex, offset] of featureOffsets.entries()) {
          if ((featureIndex + index) % 2 !== 0) continue

          const palm = new Sprite(plants)
          palm.anchor.set(0.5)
          palm.position.set(offset.x * radius, offset.y * radius)
          palm.width = (42 + (featureIndex % 3) * 6) * detailScale
          palm.height = palm.width
          palm.rotation = index * 0.7 + featureIndex * 1.3
          island.addChild(palm)
        }
      }

      if (position.style === 'rocky' || position.style === 'fortified') {
        for (const [featureIndex, offset] of featureOffsets.entries()) {
          if ((featureIndex + index) % 3 === 0) continue

          const boulder = new Sprite(rock)
          boulder.anchor.set(0.5)
          boulder.position.set(offset.x * radius, offset.y * radius)
          boulder.width = (35 + (featureIndex % 3) * 7) * detailScale
          boulder.height = (32 + ((featureIndex + index) % 3) * 8) * detailScale
          boulder.rotation = featureIndex * 0.9 + index * 0.4
          island.addChild(boulder)
        }
      }

      if (position.style === 'wreck') {
        const hull = new Sprite(wreckHull)
        hull.anchor.set(0.5)
        hull.position.set(-radius * 0.08, -radius * 0.02)
        hull.width = radius * 0.48
        hull.height = radius * 1.12
        hull.rotation = index % 2 === 0 ? 0.28 : -0.42
        hull.tint = 0x927350
        hull.alpha = 0.9
        hull.mask = mask
        island.addChild(hull)

        for (const [woodIndex, offset] of featureOffsets.entries()) {
          if (woodIndex === 2) continue

          const plank = new Sprite(wood)
          plank.anchor.set(0.5)
          plank.position.set(offset.x * radius, offset.y * radius)
          plank.width = (28 + (woodIndex % 2) * 8) * detailScale
          plank.height = 13 * detailScale
          plank.rotation = index * 0.6 + woodIndex * 1.1
          plank.tint = woodIndex % 2 === 0 ? 0x9b774f : 0x76634c
          island.addChild(plank)
        }
      }

      if (position.style === 'fortified') {
        const fort = new Graphics()
        const wall = new Graphics()
        const wallPoints = 16

        for (let wallIndex = 0; wallIndex < wallPoints; wallIndex++) {
          const angle = wallIndex / wallPoints * Math.PI * 2
          const distance = islandBoundaryRadius(obstacle, angle) * 0.56
          const pointX = Math.cos(angle) * distance
          const pointY = Math.sin(angle) * distance

          if (wallIndex === 0) wall.moveTo(pointX, pointY)
          else wall.lineTo(pointX, pointY)
        }

        wall.closePath()
        wall.fill({ color: 0x766b52, alpha: 0.94 })
        wall.stroke({ color: 0xd2c49a, alpha: 0.95, width: 5 })
        island.addChild(wall)

        fort.roundRect(-radius * 0.2, -radius * 0.16, radius * 0.4, radius * 0.32, 12)
          .fill({ color: 0x8f8060 })
        fort.roundRect(-radius * 0.2, -radius * 0.16, radius * 0.4, radius * 0.32, 12)
          .stroke({ color: 0xd6c69b, width: 4 })
        fort.rect(-radius * 0.07, -radius * 0.27, radius * 0.14, radius * 0.12)
          .fill({ color: 0xb8a77d })
        island.addChild(fort)

        for (const angle of [Math.PI, Math.PI / 3, Math.PI * 5 / 3]) {
          const localX = Math.cos(angle) * radius * 0.82
          const localY = Math.sin(angle) * radius * 0.82
          const platform = new Graphics()
          platform.circle(localX, localY, 20)
            .fill({ color: 0x6d705f })
          platform.circle(localX, localY, 20)
            .stroke({ color: 0xe5d6a9, alpha: 0.9, width: 3 })
          island.addChild(platform)

          const cannon = new Sprite(cannonTexture)
          cannon.anchor.set(0.5)
          cannon.position.set(localX, localY)
          cannon.width = 42
          cannon.height = 22
          cannon.rotation = angle
          island.addChild(cannon)

          obstacle.cannons.push({
            x: x + localX,
            y: y + localY,
            sprite: cannon,
            baseAngle: angle,
            cooldown: 1.2 + Math.random() * 1.2,
          })
        }
      }

      this.container.addChild(island)
      this.obstacles.push(obstacle)
    }

    return this.container
  }

  getPositions(): readonly Island[] {
    return this.obstacles
  }

  private traceContour(
    graphics: Graphics,
    island: Island,
    scale = 1
  ) {
    const points = 72

    for (let index = 0; index < points; index++) {
      const angle = index / points * Math.PI * 2
      const distance = islandBoundaryRadius(island, angle) * scale
      const pointX = Math.cos(angle) * distance
      const pointY = Math.sin(angle) * distance

      if (index === 0) graphics.moveTo(pointX, pointY)
      else graphics.lineTo(pointX, pointY)
    }

    graphics.closePath()
  }

  collides(x: number, y: number, radius = 0): boolean {
    return this.obstacles.some(island => {
      const dx = x - island.x
      const dy = y - island.y
      const distance = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)

      return distance < islandBoundaryRadius(island, angle) * 1.12 + radius
    })
  }

  segmentCollides(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    radius = 0
  ): boolean {
    const length = Math.hypot(endX - startX, endY - startY)
    const step = Math.max(4, Math.min(12, radius || 8))
    const samples = Math.max(1, Math.ceil(length / step))

    for (let index = 0; index <= samples; index++) {
      const progress = index / samples
      const x = startX + (endX - startX) * progress
      const y = startY + (endY - startY) * progress

      if (this.collides(x, y, radius)) return true
    }

    return false
  }

  move(
    startX: number,
    startY: number,
    deltaX: number,
    deltaY: number,
    radius: number
  ) {
    const distance = Math.hypot(deltaX, deltaY)
    const samples = Math.max(1, Math.ceil(distance / Math.max(6, radius * 0.35)))
    const stepX = deltaX / samples
    const stepY = deltaY / samples
    let x = startX
    let y = startY

    for (let index = 0; index < samples; index++) {
      const nextX = x + stepX
      const nextY = y + stepY

      if (!this.segmentCollides(x, y, nextX, nextY, radius)) {
        x = nextX
        y = nextY
        continue
      }

      if (!this.segmentCollides(x, y, nextX, y, radius)) {
        x = nextX
      } else if (!this.segmentCollides(x, y, x, nextY, radius)) {
        y = nextY
      }
    }

    return { x, y }
  }

  getDetourTarget(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    radius: number,
    searchOffset = 0
  ): { x: number; y: number } | null {
    if (!this.segmentCollides(startX, startY, targetX, targetY, radius)) {
      return null
    }

    let bestTarget: { x: number; y: number } | null = null
    let bestDistance = Infinity
    const directDistance = Math.hypot(targetX - startX, targetY - startY)

    for (const island of this.obstacles) {
      const dx = targetX - startX
      const dy = targetY - startY
      const lengthSquared = dx * dx + dy * dy
      const projection = lengthSquared > 0
        ? Math.max(
            0,
            Math.min(
              1,
              ((island.x - startX) * dx +
                (island.y - startY) * dy) /
                lengthSquared
            )
          )
        : 0
      const closestX = startX + projection * dx
      const closestY = startY + projection * dy
      const obstacleRadius = island.radius * 1.18 + radius

      if (
        Math.hypot(closestX - island.x, closestY - island.y) >=
        obstacleRadius
      ) {
        continue
      }

      const waypointRadius = island.radius * 1.2 + radius + 14

      for (let index = 0; index < 48; index++) {
        const angle = index / 48 * Math.PI * 2
        const candidate = {
          x: island.x + Math.cos(angle) * waypointRadius,
          y: island.y + Math.sin(angle) * waypointRadius,
        }
        const startDistance = Math.hypot(
          candidate.x - startX,
          candidate.y - startY
        )
        const targetDistance = Math.hypot(
          candidate.x - targetX,
          candidate.y - targetY
        )

        if (
          startDistance < Math.max(20, radius * 0.65) ||
          targetDistance >= directDistance - 2 ||
          this.segmentCollides(
            startX,
            startY,
            candidate.x,
            candidate.y,
            radius
          )
        ) {
          continue
        }

        const targetPathBlocked = this.segmentCollides(
          candidate.x,
          candidate.y,
          targetX,
          targetY,
          radius
        )
        const approachCross =
          dx * (candidate.y - startY) -
          dy * (candidate.x - startX)
        const sidePenalty = searchOffset < 0.5
          ? approachCross < 0 ? radius * 2 : 0
          : approachCross > 0 ? radius * 2 : 0
        const routeDistance =
          startDistance + targetDistance +
          (targetPathBlocked ? radius * 1.5 : 0) +
          sidePenalty

        if (routeDistance < bestDistance) {
          bestDistance = routeDistance
          bestTarget = candidate
        }
      }
    }

    return bestTarget
  }

  resolve(x: number, y: number, radius: number) {
    let resultX = x
    let resultY = y

    for (const island of this.obstacles) {
      const dx = resultX - island.x
      const dy = resultY - island.y
      const distance = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      const minimum = islandBoundaryRadius(island, angle) + radius

      if (distance < minimum) {
        const resolvedAngle = distance > 0 ? angle : 0

        resultX = island.x + Math.cos(resolvedAngle) * minimum
        resultY = island.y + Math.sin(resolvedAngle) * minimum
      }
    }

    return { x: resultX, y: resultY }
  }
}
