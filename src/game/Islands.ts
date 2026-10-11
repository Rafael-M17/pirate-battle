
import {
  Assets,
  Container,
  Graphics,
  Sprite,
  type Texture,
} from 'pixi.js'

export type Island = {
  x: number
  y: number
  radius: number
  phase: number
}

export function islandBoundaryRadius(
  island: Island,
  angle: number
): number {
  return island.radius * (
    1 +
    0.07 * Math.sin(angle * 3 + island.phase) +
    0.045 * Math.sin(angle * 5 - island.phase * 0.7) +
    0.025 * Math.cos(angle * 7 + island.phase * 1.3)
  )
}

export class Islands {
  private container = new Container()
  private obstacles: Island[] = []

  async create(width: number, height: number) {
    const base = '/assets/png/default/tiles/'

    const [sand, rock, plants] = await Promise.all([
      Assets.load<Texture>(base + 'tile_4.png'),
      Assets.load<Texture>(base + 'tile_50.png'),
      Assets.load<Texture>(base + 'tile_71.png'),
    ])

    const positions = [
      { x: 0.18, y: 0.24, radius: 85 },
      { x: 0.81, y: 0.38, radius: 105 },
      { x: 0.35, y: 0.82, radius: 75 },
    ]

    for (const position of positions) {
      const x = position.x * width
      const y = position.y * height
      const radius = position.radius
      const obstacle: Island = {
        x,
        y,
        radius: radius * 0.78,
        phase: this.obstacles.length * 1.7 + 0.4,
      }

      const island = new Container()
      island.position.set(x, y)

      const mask = new Graphics()
      const points = 64

      for (let index = 0; index < points; index++) {
        const angle = index / points * Math.PI * 2
        const distance = islandBoundaryRadius(obstacle, angle)
        const pointX = Math.cos(angle) * distance
        const pointY = Math.sin(angle) * distance

        if (index === 0) {
          mask.moveTo(pointX, pointY)
        } else {
          mask.lineTo(pointX, pointY)
        }
      }

      mask.closePath()
      mask.fill({ color: '#ffffff' })

      const sandSprite = new Sprite(sand)
      sandSprite.anchor.set(0.5)
      sandSprite.width = radius * 2.2
      sandSprite.height = radius * 2.2
      sandSprite.mask = mask
      island.addChild(sandSprite)
      island.addChild(mask)

      const shore = new Graphics()
      for (let index = 0; index < points; index++) {
        const angle = index / points * Math.PI * 2
        const distance = islandBoundaryRadius(obstacle, angle)
        const pointX = Math.cos(angle) * distance
        const pointY = Math.sin(angle) * distance

        if (index === 0) {
          shore.moveTo(pointX, pointY)
        } else {
          shore.lineTo(pointX, pointY)
        }
      }
      shore.closePath()
      shore.stroke({ color: '#f2dfa9', alpha: 0.8, width: 3 })
      island.addChild(shore)

      const rockSprite = new Sprite(rock)
      rockSprite.anchor.set(0.5)
      rockSprite.position.set(-radius * 0.35, -radius * 0.2)
      rockSprite.width = 48
      rockSprite.height = 48
      island.addChild(rockSprite)

      const plantSprite = new Sprite(plants)
      plantSprite.anchor.set(0.5)
      plantSprite.position.set(radius * 0.3, radius * 0.2)
      plantSprite.width = 55
      plantSprite.height = 55
      island.addChild(plantSprite)

      this.container.addChild(island)
      this.obstacles.push(obstacle)
    }

    return this.container
  }

  getPositions(): readonly Island[] {
    return this.obstacles
  }

  collides(x: number, y: number, radius = 0): boolean {
    return this.obstacles.some(island => {
      const dx = x - island.x
      const dy = y - island.y
      const distance = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)

      return distance < islandBoundaryRadius(island, angle) + radius
    })
  }

  segmentCollides(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    radius = 0
  ): boolean {
    return this.obstacles.some(island => {
      const segmentX = endX - startX
      const segmentY = endY - startY
      const lengthSquared =
        segmentX * segmentX + segmentY * segmentY
      const projection = lengthSquared > 0
        ? Math.max(
            0,
            Math.min(
              1,
              ((island.x - startX) * segmentX +
                (island.y - startY) * segmentY) /
                lengthSquared
            )
          )
        : 0
      const closestX = startX + projection * segmentX
      const closestY = startY + projection * segmentY

      const dx = closestX - island.x
      const dy = closestY - island.y
      const angle = Math.atan2(dy, dx)

      return Math.hypot(dx, dy) <
        islandBoundaryRadius(island, angle) + radius
    })
  }

  getDetourTarget(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    radius: number
  ): { x: number; y: number } | null {
    let bestTarget: { x: number; y: number } | null = null
    let bestDistance = Infinity

    for (const island of this.obstacles) {
      const obstacleRadius = island.radius * 1.15 + radius + 2

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

      if (
        Math.hypot(closestX - island.x, closestY - island.y) >=
        obstacleRadius
      ) {
        continue
      }

      const startDistance = Math.hypot(
        startX - island.x,
        startY - island.y
      )
      const centerAngle = Math.atan2(
        startY - island.y,
        startX - island.x
      )
      const tangentAngle = Math.acos(
        Math.min(1, obstacleRadius / Math.max(
          obstacleRadius,
          startDistance
        ))
      )
      const targetCross =
        (startX - island.x) * (targetY - island.y) -
        (startY - island.y) * (targetX - island.x)
      const preferredSide = targetCross >= 0 ? 1 : -1

      for (const side of [preferredSide, -preferredSide]) {
        const angle = centerAngle + side * (
          startDistance > obstacleRadius
            ? tangentAngle
            : 0.5
        )
        const candidate = {
          x: island.x + Math.cos(angle) * obstacleRadius,
          y: island.y + Math.sin(angle) * obstacleRadius,
        }
        const routeDistance =
          Math.hypot(candidate.x - startX, candidate.y - startY) +
          Math.hypot(targetX - candidate.x, targetY - candidate.y)

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
