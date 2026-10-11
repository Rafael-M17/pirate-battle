
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from 'pixi.js'
import {
  Islands,
  islandBoundaryRadius,
  type Island,
} from './Islands'
type EnemyType = 'chaser' | 'shooter'
type Weapon = 'front' | 'left' | 'right'

type Bullet = {
  sprite: Sprite
  vx: number
  vy: number
  distance: number
  owner: 'player' | 'enemy'
}

type Enemy = {
  sprite: Sprite
  bar: Graphics
  type: EnemyType
  health: number
  cooldown: number
  homeIsland: Island | null
  patrolAngle: number
}

type Explosion = {
  sprite: Sprite
  remaining: number
}

type WakeParticle = {
  graphics: Graphics
  remaining: number
  lifetime: number
}

const CONFIG = {
  playerSpeed: 220,
  rotationSpeed: 2.8,
  playerRadius: 30,
  bulletSpeed: 480,
  bulletRange: 650,
  frontReload: 0.8,
  sideReload: 2,
  chaserSpeed: 115,
  shooterSpeed: 85,
  enemyHealth: 3,
  chaserDamage: 25,
  shooterDamage: 10,
  maxEnemies: 8,
  maxPerType: 5,
  shooterReload: 2.3,
  enemyRadius: 27,
  playerSpawnDistance: 430,
  enemySpawnDistance: 110,
  defenderAlertDistance: 500,
}

export type GameOptions = {
  matchDuration: number
  spawnInterval: number
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  matchDuration: 90,
  spawnInterval: 5,
}

export type GameResult = {
  outcome: 'victory' | 'game-over'
  score: number
  survivedSeconds: number
}

export class Game {
  private readonly options: GameOptions
  private islands = new Islands()
  private app = new Application()
  private world = new Container()
  private worldWidth = 0
  private worldHeight = 0
  private ship: Sprite | null = null
  private textures: Record<string, Texture> = {}

  private keys = new Set<string>()
  private bullets: Bullet[] = []
  private enemies: Enemy[] = []
  private explosions: Explosion[] = []
  private wakeParticles: WakeParticle[] = []
  private wakeTimer = 0

  private health = 100
  private score = 0
  private elapsed = 0
  private spawnTimer = 0
  private nextEnemy: EnemyType = 'chaser'

  private cooldowns: Record<Weapon, number> = {
    front: 0,
    left: 0,
    right: 0,
  }

  private running = false
  private paused = false
  private destroyed = false
  private initialized = false
  private onGameEnd: ((result: GameResult) => void) | null = null
  private onPauseChange: ((paused: boolean) => void) | null = null

  constructor(options: GameOptions = DEFAULT_GAME_OPTIONS) {
    this.options = { ...options }
  }

  private scoreText = new Text({
    text: 'SCORE: 0',
    style: {
      fill: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
    },
  })

  private hpText = new Text({
    text: 'HP: 100',
    style: {
      fill: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
    },
  })

  private timeText = new Text({
    text: 'TIME LEFT: 01:30',
    style: {
      fill: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
    },
  })

  private keyDown = (event: KeyboardEvent) => {
    if (!this.running) return

    const key = event.key.toLowerCase()
    if (key === 'escape') {
      event.preventDefault()
      if (event.repeat) return
      if (this.paused) this.resume()
      else this.pause()
      return
    }

    if (this.paused) return

    const controls = [
      'w', 'a', 's', 'd', 'q', 'e', ' ',
      'arrowup', 'arrowdown',
      'arrowleft', 'arrowright',
    ]

    if (controls.includes(key)) {
      event.preventDefault()
      this.keys.add(key)
    }
  }

  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase())
  }

  private handleBlur = () => {
    this.keys.clear()
    this.pause()
  }

  private handleVisibilityChange = () => {
    if (document.hidden) this.handleBlur()
  }

  async start(
    element: HTMLElement,
    onGameEnd: (result: GameResult) => void,
    onPauseChange: (paused: boolean) => void
  ) {
    this.onGameEnd = onGameEnd
    this.onPauseChange = onPauseChange

    await this.app.init({
      resizeTo: element,
      background: '#087e9c',
      antialias: true,
    })

    this.initialized = true

    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }

    this.worldWidth = this.app.screen.width * 3
    this.worldHeight = this.app.screen.height * 3

    const water = this.createWaterBackground()
    const islandContainer = await this.islands.create(
      this.worldWidth,
      this.worldHeight
    )

    if (this.destroyed) {
      islandContainer.destroy({ children: true })
      this.app.destroy(true, { children: true })
      return
    }

    const base = '/assets/png/default/'

    const [player, chaser, shooter, ball, explosion] =
      await Promise.all([
        Assets.load<Texture>(base + 'ships/ship_2.png'),
        Assets.load<Texture>(base + 'ships/ship_8.png'),
        Assets.load<Texture>(base + 'ships/ship_20.png'),
        Assets.load<Texture>(
          base + 'ship_parts/cannon_ball.png'
        ),
        Assets.load<Texture>(
          base + 'effects/explosion_2.png'
        ),
      ])

    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }

    this.textures = {
      player,
      chaser,
      shooter,
      ball,
      explosion,
    }

    element.appendChild(this.app.canvas)
    this.app.stage.addChild(this.world)
    this.world.addChild(water, islandContainer)

    this.ship = new Sprite(player)
    this.ship.anchor.set(0.5)
    this.ship.width = 75
    this.ship.height = 95
    this.ship.scale.y *= -1

    const centerX = this.worldWidth / 2
    const centerY = this.worldHeight / 2
    const resolvedStart = this.islands.resolve(
      centerX,
      centerY,
      CONFIG.playerRadius
    )
    const maxX = this.worldWidth - 48
    const maxY = this.worldHeight - 48
    this.ship.position.set(
      Math.max(48, Math.min(maxX, resolvedStart.x)),
      Math.max(48, Math.min(maxY, resolvedStart.y))
    )

    if (
      this.islands.collides(
        this.ship.x,
        this.ship.y,
        CONFIG.playerRadius
      )
    ) {
      let nearestPosition: { x: number; y: number } | null = null
      let nearestDistance = Infinity

      for (let y = 48; y <= maxY; y += 24) {
        for (let x = 48; x <= maxX; x += 24) {
          if (
            this.islands.collides(
              x,
              y,
              CONFIG.playerRadius
            )
          ) {
            continue
          }

          const distance = Math.hypot(x - centerX, y - centerY)

          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestPosition = { x, y }
          }
        }
      }

      if (nearestPosition) {
        this.ship.position.set(
          nearestPosition.x,
          nearestPosition.y
        )
      }
    }

    this.world.addChild(this.ship)

    this.scoreText.position.set(20, 15)
    this.hpText.position.set(20, 45)
    this.timeText.position.set(20, 75)
    this.timeText.text =
      `TIME LEFT: ${String(Math.floor(this.options.matchDuration / 60)).padStart(2, '0')}:` +
      String(this.options.matchDuration % 60).padStart(2, '0')

    this.app.stage.addChild(
      this.scoreText,
      this.hpText,
      this.timeText
    )

    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.handleBlur)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    this.running = true

    for (const [index, island] of
      this.islands.getPositions().entries()) {
      this.spawnEnemy(
        index % 2 === 0 ? 'chaser' : 'shooter',
        island
      )
    }

    this.spawnEnemy('chaser')
    this.spawnEnemy('shooter')
    this.nextEnemy = 'chaser'
    this.updateCamera(0, true)

    this.app.ticker.add(this.update)
  }

  private spawnEnemy(
    type: EnemyType,
    homeIsland: Island | null = null
  ): boolean {
    if (!this.ship || !this.running) return false
    if (this.enemies.length >= CONFIG.maxEnemies) return false

    const count = this.enemies.filter(
      enemy => enemy.type === type
    ).length

    if (count >= CONFIG.maxPerType) return false

    const sprite = new Sprite(this.textures[type])
    sprite.anchor.set(0.5)
    sprite.width = 70
    sprite.height = 90
    sprite.scale.y *= -1

    const position = homeIsland
      ? this.findIslandSpawn(homeIsland)
      : this.findWorldSpawn()

    if (!position) {
      sprite.destroy()
      return false
    }

    sprite.position.set(position.x, position.y)
    const bar = new Graphics()

    const enemy: Enemy = {
      sprite,
      bar,
      type,
      health: CONFIG.enemyHealth,
      cooldown: 1.5,
      homeIsland,
      patrolAngle: Math.random() * Math.PI * 2,
    }

    this.enemies.push(enemy)
    this.world.addChild(sprite, bar)
    this.drawHealth(enemy)

    return true
  }

  private isValidSpawn(x: number, y: number): boolean {
    if (!this.ship) return false

    if (
      x < 48 ||
      y < 48 ||
      x > this.worldWidth - 48 ||
      y > this.worldHeight - 48 ||
      Math.hypot(x - this.ship.x, y - this.ship.y) <
        CONFIG.playerSpawnDistance ||
      this.islands.collides(x, y, CONFIG.enemyRadius)
    ) {
      return false
    }

    return !this.enemies.some(enemy =>
      Math.hypot(x - enemy.sprite.x, y - enemy.sprite.y) <
        CONFIG.enemySpawnDistance
    )
  }

  private findIslandSpawn(
    island: Island
  ): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = attempt * Math.PI / 12
      const distance = islandBoundaryRadius(island, angle) +
        CONFIG.enemyRadius + 48
      const x = island.x + Math.cos(angle) * distance
      const y = island.y + Math.sin(angle) * distance

      if (this.isValidSpawn(x, y)) return { x, y }
    }

    return null
  }

  private findWorldSpawn(): { x: number; y: number } | null {
    const columns = 4
    const rows = 4
    const cellWidth = this.worldWidth / columns
    const cellHeight = this.worldHeight / rows
    const cells = Array.from(
      { length: columns * rows },
      (_, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)

        return {
          column,
          row,
          population: this.enemies.filter(enemy =>
            Math.floor(enemy.sprite.x / cellWidth) === column &&
            Math.floor(enemy.sprite.y / cellHeight) === row
          ).length,
        }
      }
    )

    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }

    cells.sort((a, b) => a.population - b.population)

    for (const cell of cells) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const x = (cell.column + 0.12 + Math.random() * 0.76) *
          cellWidth
        const y = (cell.row + 0.12 + Math.random() * 0.76) *
          cellHeight

        if (this.isValidSpawn(x, y)) return { x, y }
      }
    }

    return null
  }

  private createWaterBackground(): Graphics {
    const water = new Graphics()
    water.rect(0, 0, this.worldWidth, this.worldHeight)
    water.fill('#087e9c')

    const spacing = 180
    const columns = Math.ceil(this.worldWidth / spacing)
    const rows = Math.ceil(this.worldHeight / spacing)

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const value = Math.sin(
          column * 127.1 + row * 311.7
        ) * 43758.5453
        const random = value - Math.floor(value)
        const x = column * spacing + random * 70 + 24
        const y = row * spacing + (1 - random) * 70 + 24
        const length = 28 + random * 24

        water
          .moveTo(x, y)
          .quadraticCurveTo(
            x + length * 0.5,
            y + (random - 0.5) * 12,
            x + length,
            y + (random - 0.5) * 5
          )
          .stroke({
            color: 0x8ce1df,
            alpha: 0.14,
            width: 2,
          })

        if (random > 0.58) {
          water
            .moveTo(x + 8, y + 8)
            .quadraticCurveTo(
              x + length * 0.45,
              y + 5 + random * 5,
              x + length - 6,
              y + 8
            )
            .stroke({
              color: 0x064f71,
              alpha: 0.12,
              width: 2,
            })
        }

        if (random > 0.82) {
          water.circle(x + length + 13, y - 5, 1.5)
            .fill({ color: 0xc7f4ed, alpha: 0.18 })
        }
      }
    }

    return water
  }

  private updateCamera(dt = 0, immediate = false) {
    if (!this.ship) return

    const targetX = Math.max(
      this.app.screen.width - this.worldWidth,
      Math.min(0, this.app.screen.width / 2 - this.ship.x)
    )
    const targetY = Math.max(
      this.app.screen.height - this.worldHeight,
      Math.min(0, this.app.screen.height / 2 - this.ship.y)
    )
    const smoothing = immediate ? 1 : 1 - Math.exp(-7 * dt)

    this.world.position.set(
      this.world.x + (targetX - this.world.x) * smoothing,
      this.world.y + (targetY - this.world.y) * smoothing
    )
  }

  private createWake(movement: number) {
    if (!this.ship) return

    const direction = Math.sign(movement)
    const forwardX = Math.sin(this.ship.rotation) * direction
    const forwardY = -Math.cos(this.ship.rotation) * direction
    const rearX = this.ship.x - forwardX * 40
    const rearY = this.ship.y - forwardY * 40
    const sideX = -forwardY * 9
    const sideY = forwardX * 9
    const graphics = new Graphics()

    graphics.circle(rearX, rearY, 5)
      .circle(rearX + sideX, rearY + sideY, 3.5)
      .circle(rearX - sideX, rearY - sideY, 3.5)
      .fill({ color: 0xd8f8f2, alpha: 0.48 })

    this.world.addChild(graphics)
    this.wakeParticles.push({
      graphics,
      remaining: 0.65,
      lifetime: 0.65,
    })
  }

  private updateWake(dt: number, movement: number) {
    if (movement !== 0) {
      this.wakeTimer += dt

      if (this.wakeTimer >= 0.11) {
        this.wakeTimer %= 0.11
        this.createWake(movement)
      }
    } else {
      this.wakeTimer = 0
    }

    for (let index = this.wakeParticles.length - 1; index >= 0; index--) {
      const particle = this.wakeParticles[index]
      particle.remaining -= dt
      const progress = particle.remaining / particle.lifetime
      particle.graphics.alpha = Math.max(0, progress)
      particle.graphics.scale.set(0.7 + (1 - progress) * 0.6)

      if (particle.remaining <= 0) {
        this.world.removeChild(particle.graphics)
        particle.graphics.destroy()
        this.wakeParticles.splice(index, 1)
      }
    }
  }

  private drawHealth(enemy: Enemy) {
    enemy.bar.clear()

    enemy.bar.rect(-30, -55, 60, 7)
    enemy.bar.fill('#692323')

    enemy.bar.rect(
      -30,
      -55,
      60 * enemy.health / CONFIG.enemyHealth,
      7
    )

    enemy.bar.fill('#2ee970')
    enemy.bar.position.copyFrom(enemy.sprite.position)
  }

  private explode(x: number, y: number) {
    const sprite = new Sprite(this.textures.explosion)

    sprite.anchor.set(0.5)
    sprite.width = 85
    sprite.height = 85
    sprite.position.set(x, y)

    this.world.addChild(sprite)

    this.explosions.push({
      sprite,
      remaining: 0.4,
    })
  }

  private removeEnemy(enemy: Enemy, scored: boolean) {
    if (!this.enemies.includes(enemy)) return

    this.explode(enemy.sprite.x, enemy.sprite.y)

    this.enemies = this.enemies.filter(
      item => item !== enemy
    )

    this.world.removeChild(enemy.sprite, enemy.bar)
    enemy.sprite.destroy()
    enemy.bar.destroy()

    if (scored) {
      this.score++
      this.scoreText.text = `SCORE: ${this.score}`
    }
  }

  private createBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    owner: 'player' | 'enemy'
  ) {
    const sprite = new Sprite(this.textures.ball)

    sprite.anchor.set(0.5)
    sprite.width = owner === 'enemy' ? 15 : 13
    sprite.height = owner === 'enemy' ? 15 : 13
    sprite.tint = owner === 'enemy'
      ? 0xff7777
      : 0xffffff

    sprite.position.set(x, y)
    this.world.addChild(sprite)

    this.bullets.push({
      sprite,
      vx,
      vy,
      distance: 0,
      owner,
    })
  }

  private fire(side: Weapon) {
    if (!this.ship) return

    const angle = this.ship.rotation

    const fx = Math.sin(angle)
    const fy = -Math.cos(angle)
    const rx = Math.cos(angle)
    const ry = Math.sin(angle)

    const offsets = side === 'front'
      ? [0]
      : [-23, 0, 23]

    for (const offset of offsets) {
      const sign = side === 'right' ? 1 : -1

      const x = this.ship.x + (
        side === 'front'
          ? fx * 42
          : rx * 29 * sign + fx * offset
      )

      const y = this.ship.y + (
        side === 'front'
          ? fy * 42
          : ry * 29 * sign + fy * offset
      )

      const vx = (
        side === 'front' ? fx : rx * sign
      ) * CONFIG.bulletSpeed

      const vy = (
        side === 'front' ? fy : ry * sign
      ) * CONFIG.bulletSpeed

      this.createBullet(x, y, vx, vy, 'player')
    }
  }

  private damagePlayer(amount: number) {
    if (!this.running) return

    this.health = Math.max(0, this.health - amount)
    this.hpText.text = `HP: ${this.health}`

    if (this.health <= 0) {
      this.explode(
        this.ship?.x ?? 0,
        this.ship?.y ?? 0
      )

      this.hpText.text = 'GAME OVER'
      this.endGame('game-over')
    }
  }

  private endGame(outcome: GameResult['outcome']) {
    if (!this.running) return

    this.running = false
    this.keys.clear()

    for (const bullet of this.bullets) {
      this.world.removeChild(bullet.sprite)
      bullet.sprite.destroy()
    }
    this.bullets = []

    this.onGameEnd?.({
      outcome,
      score: this.score,
      survivedSeconds: Math.floor(this.elapsed),
    })
  }

  private updateEnemy(enemy: Enemy, dt: number) {
    if (!this.ship) return

    const playerDistance = Math.hypot(
      this.ship.x - enemy.sprite.x,
      this.ship.y - enemy.sprite.y
    )
    const defending = enemy.homeIsland !== null
    const alerted = !defending ||
      playerDistance <= CONFIG.defenderAlertDistance

    if (defending && !alerted) {
      enemy.patrolAngle += dt * 0.45
    }

    const target = defending && !alerted && enemy.homeIsland
      ? {
          x: enemy.homeIsland.x +
            Math.cos(enemy.patrolAngle) *
              (enemy.homeIsland.radius + 85),
          y: enemy.homeIsland.y +
            Math.sin(enemy.patrolAngle) *
              (enemy.homeIsland.radius + 85),
        }
      : { x: this.ship.x, y: this.ship.y }
    const dx = target.x - enemy.sprite.x
    const dy = target.y - enemy.sprite.y
    const distance = Math.hypot(dx, dy)
    const targetAngle = Math.atan2(dx, -dy)
    const isChaser = enemy.type === 'chaser'
    const move = isChaser
      ? 1
      : distance > 350
        ? 1
        : distance < 240
          ? -1
          : 0
    const movementTarget = move > 0
      ? { x: target.x, y: target.y }
      : move < 0
        ? {
            x: enemy.sprite.x - dx,
            y: enemy.sprite.y - dy,
          }
        : null
    const detourTarget = (movementTarget || isChaser && distance > 1)
      ? this.islands.getDetourTarget(
          enemy.sprite.x,
          enemy.sprite.y,
          movementTarget?.x ?? target.x,
          movementTarget?.y ?? target.y,
          CONFIG.enemyRadius
        )
      : null

    const steeringAngle = detourTarget
      ? Math.atan2(
          detourTarget.x - enemy.sprite.x,
          -(detourTarget.y - enemy.sprite.y)
        )
      : targetAngle
    let difference = Math.atan2(
      Math.sin(steeringAngle - enemy.sprite.rotation),
      Math.cos(steeringAngle - enemy.sprite.rotation)
    )

    const maxTurn = 2.2 * dt

    difference = Math.max(
      -maxTurn,
      Math.min(maxTurn, difference)
    )

    enemy.sprite.rotation += difference

    if (enemy.type === 'chaser') {
      const nextPosition = this.islands.resolve(
        enemy.sprite.x +
          Math.sin(enemy.sprite.rotation) *
            CONFIG.chaserSpeed * dt,
        enemy.sprite.y -
          Math.cos(enemy.sprite.rotation) *
            CONFIG.chaserSpeed * dt,
        CONFIG.enemyRadius
      )

      enemy.sprite.position.set(nextPosition.x, nextPosition.y)

      enemy.sprite.x = Math.max(
        48,
        Math.min(this.worldWidth - 48, enemy.sprite.x)
      )
      enemy.sprite.y = Math.max(
        48,
        Math.min(this.worldHeight - 48, enemy.sprite.y)
      )

      const newDistance = Math.hypot(
        this.ship.x - enemy.sprite.x,
        this.ship.y - enemy.sprite.y
      )

      if (newDistance < 48) {
        this.removeEnemy(enemy, false)
        this.damagePlayer(CONFIG.chaserDamage)

        // Enemy has been destroyed.
        // Do not update its health bar again.
        return
      }
    } else {
      let moveX = Math.sin(enemy.sprite.rotation) * move
      let moveY = -Math.cos(enemy.sprite.rotation) * move

      if (detourTarget) {
        const detourX = detourTarget.x - enemy.sprite.x
        const detourY = detourTarget.y - enemy.sprite.y
        const detourDistance = Math.hypot(detourX, detourY)

        if (detourDistance > 0) {
          moveX = detourX / detourDistance
          moveY = detourY / detourDistance
        }
      }

      const nextPosition = this.islands.resolve(
        enemy.sprite.x +
          moveX * CONFIG.shooterSpeed * dt,
        enemy.sprite.y +
          moveY * CONFIG.shooterSpeed * dt,
        CONFIG.enemyRadius
      )

      enemy.sprite.position.set(nextPosition.x, nextPosition.y)

      enemy.sprite.x = Math.max(
        48,
        Math.min(
          this.worldWidth - 48,
          enemy.sprite.x
        )
      )

      enemy.sprite.y = Math.max(
        48,
        Math.min(
          this.worldHeight - 48,
          enemy.sprite.y
        )
      )

      enemy.cooldown -= dt

      const firingRange = defending
        ? CONFIG.defenderAlertDistance
        : 530

      if (enemy.cooldown <= 0 && alerted && playerDistance < firingRange) {
        const aim = Math.atan2(
          this.ship.y - enemy.sprite.y,
          this.ship.x - enemy.sprite.x
        )

        this.createBullet(
          enemy.sprite.x + Math.cos(aim) * 38,
          enemy.sprite.y + Math.sin(aim) * 38,
          Math.cos(aim) * 290,
          Math.sin(aim) * 290,
          'enemy'
        )

        enemy.cooldown = CONFIG.shooterReload
      }
    }

    // Only update living enemies
    if (this.enemies.includes(enemy)) {
      this.drawHealth(enemy)
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]

      const previousX = bullet.sprite.x
      const previousY = bullet.sprite.y
      bullet.sprite.x += bullet.vx * dt
      bullet.sprite.y += bullet.vy * dt

      bullet.distance += Math.hypot(
        bullet.vx,
        bullet.vy
      ) * dt

      let hit = this.islands.segmentCollides(
        previousX,
        previousY,
        bullet.sprite.x,
        bullet.sprite.y,
        5
      )

      if (!hit && bullet.owner === 'player') {
        for (const enemy of [...this.enemies]) {
          const distance = Math.hypot(
            bullet.sprite.x - enemy.sprite.x,
            bullet.sprite.y - enemy.sprite.y
          )

          if (distance < 36) {
            enemy.health--
            hit = true

            if (enemy.health <= 0) {
              this.removeEnemy(enemy, true)
            } else {
              this.drawHealth(enemy)
            }

            break
          }
        }
      } else if (!hit && this.ship) {
        const distance = Math.hypot(
          bullet.sprite.x - this.ship.x,
          bullet.sprite.y - this.ship.y
        )

        if (distance < 33) {
          hit = true
          this.damagePlayer(CONFIG.shooterDamage)
          if (!this.running) return
        }
      }

      const outside =
        bullet.sprite.x < -30 ||
        bullet.sprite.y < -30 ||
        bullet.sprite.x > this.worldWidth + 30 ||
        bullet.sprite.y > this.worldHeight + 30

      if (
        hit ||
        outside ||
        bullet.distance >= CONFIG.bulletRange
      ) {
        this.world.removeChild(bullet.sprite)
        bullet.sprite.destroy()
        this.bullets.splice(i, 1)
      }

      if (!this.running) break
    }
  }

  private updateExplosions(dt: number) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const effect = this.explosions[i]

      effect.remaining -= dt
      effect.sprite.alpha = Math.max(
        0,
        effect.remaining / 0.4
      )

      if (effect.remaining <= 0) {
        this.world.removeChild(effect.sprite)
        effect.sprite.destroy()
        this.explosions.splice(i, 1)
      }
    }
  }

  private update = () => {
    if (!this.ship || this.paused) return

    const dt = Math.min(
      this.app.ticker.deltaMS / 1000,
      0.05
    )

    this.updateExplosions(dt)

    if (!this.running) return

    this.elapsed += dt
    if (this.elapsed >= this.options.matchDuration) {
      this.elapsed = this.options.matchDuration
      this.timeText.text = 'TIME LEFT: 00:00'
      this.endGame('victory')
      return
    }

    const remaining = this.options.matchDuration - Math.floor(this.elapsed)
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    this.timeText.text =
      `TIME LEFT: ${String(minutes).padStart(2, '0')}:` +
      String(seconds).padStart(2, '0')

    this.cooldowns.front = Math.max(
      0,
      this.cooldowns.front - dt
    )

    this.cooldowns.left = Math.max(
      0,
      this.cooldowns.left - dt
    )

    this.cooldowns.right = Math.max(
      0,
      this.cooldowns.right - dt
    )

    // Player rotation
    if (
      this.keys.has('a') ||
      this.keys.has('arrowleft')
    ) {
      this.ship.rotation -= CONFIG.rotationSpeed * dt
    }

    if (
      this.keys.has('d') ||
      this.keys.has('arrowright')
    ) {
      this.ship.rotation += CONFIG.rotationSpeed * dt
    }

    let movement = 0

    if (
      this.keys.has('w') ||
      this.keys.has('arrowup')
    ) movement++

    if (
      this.keys.has('s') ||
      this.keys.has('arrowdown')
    ) movement--

    const nextPosition = this.islands.resolve(
      this.ship.x +
      Math.sin(this.ship.rotation) *
      CONFIG.playerSpeed * movement * dt,
      this.ship.y -
      Math.cos(this.ship.rotation) *
      CONFIG.playerSpeed * movement * dt,
      CONFIG.playerRadius
    )

    const previousShipX = this.ship.x
    const previousShipY = this.ship.y
    this.ship.position.set(nextPosition.x, nextPosition.y)

    this.ship.x = Math.max(
      48,
      Math.min(
        this.worldWidth - 48,
        this.ship.x
      )
    )

    this.ship.y = Math.max(
      48,
      Math.min(
        this.worldHeight - 48,
        this.ship.y
      )
    )

    const isMoving = Math.hypot(
      this.ship.x - previousShipX,
      this.ship.y - previousShipY
    ) > 0.1
    this.updateWake(dt, isMoving ? movement : 0)

    // Independent weapons
    if (
      this.keys.has(' ') &&
      this.cooldowns.front <= 0
    ) {
      this.fire('front')
      this.cooldowns.front = CONFIG.frontReload
    }

    if (
      this.keys.has('q') &&
      this.cooldowns.left <= 0
    ) {
      this.fire('left')
      this.cooldowns.left = CONFIG.sideReload
    }

    if (
      this.keys.has('e') &&
      this.cooldowns.right <= 0
    ) {
      this.fire('right')
      this.cooldowns.right = CONFIG.sideReload
    }

    // Alternate Chaser and Shooter spawns
    this.spawnTimer += dt

    if (this.spawnTimer >= this.options.spawnInterval) {
      this.spawnTimer = 0

      const first = this.nextEnemy
      const second: EnemyType =
        first === 'chaser' ? 'shooter' : 'chaser'

      if (this.spawnEnemy(first)) {
        this.nextEnemy = second
      } else if (this.spawnEnemy(second)) {
        this.nextEnemy = first
      }
    }

    // Enemy behavior
    for (const enemy of [...this.enemies]) {
      if (!this.running) break
      this.updateEnemy(enemy, dt)
    }

    if (this.running) {
      this.updateBullets(dt)
    }

    this.updateCamera(dt)
  }

  pause() {
    if (!this.running || this.paused) return

    this.paused = true
    this.keys.clear()
    this.onPauseChange?.(true)
  }

  resume() {
    if (!this.running || !this.paused) return

    this.keys.clear()
    this.paused = false
    this.onPauseChange?.(false)
  }

  destroy() {
    if (this.destroyed) return

    this.destroyed = true
    this.running = false

    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.handleBlur)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)

    if (this.initialized) {
      this.app.ticker.remove(this.update)
      this.app.destroy(true, { children: true })
    }

    this.keys.clear()
  }
}
