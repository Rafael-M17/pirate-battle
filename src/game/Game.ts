
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  type Texture,
} from 'pixi.js'

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
}

type Explosion = {
  sprite: Sprite
  remaining: number
}

const CONFIG = {
  playerSpeed: 220,
  rotationSpeed: 2.8,
  bulletSpeed: 480,
  bulletRange: 650,
  frontReload: 0.8,
  sideReload: 2,
  chaserSpeed: 115,
  shooterSpeed: 85,
  enemyHealth: 3,
  chaserDamage: 25,
  shooterDamage: 10,
  spawnInterval: 5,
  maxPerType: 3,
  shooterReload: 2.3,
}

export class Game {
  private app = new Application()
  private world = new Container()
  private ship: Sprite | null = null
  private textures: Record<string, Texture> = {}

  private keys = new Set<string>()
  private bullets: Bullet[] = []
  private enemies: Enemy[] = []
  private explosions: Explosion[] = []

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
  private destroyed = false
  private initialized = false

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
    text: 'TIME: 0',
    style: {
      fill: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
    },
  })

  private keyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
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

  private clearKeys = () => {
    this.keys.clear()
  }

  async start(element: HTMLElement) {
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

    this.ship = new Sprite(player)
    this.ship.anchor.set(0.5)
    this.ship.width = 75
    this.ship.height = 95
    this.ship.scale.y *= -1

    this.ship.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2
    )

    this.world.addChild(this.ship)

    this.scoreText.position.set(20, 15)
    this.hpText.position.set(20, 45)
    this.timeText.position.set(20, 75)

    this.app.stage.addChild(
      this.scoreText,
      this.hpText,
      this.timeText
    )

    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.clearKeys)

    this.running = true

    this.spawnEnemy('chaser')
    this.spawnEnemy('shooter')
    this.nextEnemy = 'chaser'

    this.app.ticker.add(this.update)
  }

  private spawnEnemy(type: EnemyType): boolean {
    if (!this.ship || !this.running) return false

    const count = this.enemies.filter(
      enemy => enemy.type === type
    ).length

    if (count >= CONFIG.maxPerType) return false

    const sprite = new Sprite(this.textures[type])
    sprite.anchor.set(0.5)
    sprite.width = 70
    sprite.height = 90
    sprite.scale.y *= -1

    const width = this.app.screen.width
    const height = this.app.screen.height
    const margin = 55

    let valid = false

    for (let attempt = 0; attempt < 50; attempt++) {
      const x = margin + Math.random() *
        Math.max(1, width - margin * 2)

      const y = margin + Math.random() *
        Math.max(1, height - margin * 2)

      const playerDistance = Math.hypot(
        x - this.ship.x,
        y - this.ship.y
      )

      const enemyNearby = this.enemies.some(enemy =>
        Math.hypot(
          x - enemy.sprite.x,
          y - enemy.sprite.y
        ) < 110
      )

      if (playerDistance > 230 && !enemyNearby) {
        sprite.position.set(x, y)
        valid = true
        break
      }
    }

    if (!valid) {
      sprite.destroy()
      return false
    }

    const bar = new Graphics()

    const enemy: Enemy = {
      sprite,
      bar,
      type,
      health: CONFIG.enemyHealth,
      cooldown: 1.5,
    }

    this.enemies.push(enemy)
    this.world.addChild(sprite, bar)
    this.drawHealth(enemy)

    return true
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

      this.running = false
      this.clearKeys()
      this.hpText.text = 'GAME OVER'
    }
  }

  private updateEnemy(enemy: Enemy, dt: number) {
    if (!this.ship) return

    const dx = this.ship.x - enemy.sprite.x
    const dy = this.ship.y - enemy.sprite.y
    const distance = Math.hypot(dx, dy)

    if (distance < 0.01) return

    const targetAngle = Math.atan2(dx, -dy)

    let difference = Math.atan2(
      Math.sin(targetAngle - enemy.sprite.rotation),
      Math.cos(targetAngle - enemy.sprite.rotation)
    )

    const maxTurn = 2.2 * dt

    difference = Math.max(
      -maxTurn,
      Math.min(maxTurn, difference)
    )

    enemy.sprite.rotation += difference

    if (enemy.type === 'chaser') {
      enemy.sprite.x +=
        Math.sin(enemy.sprite.rotation) *
        CONFIG.chaserSpeed * dt

      enemy.sprite.y -=
        Math.cos(enemy.sprite.rotation) *
        CONFIG.chaserSpeed * dt

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
      let move = 0

      if (distance > 350) move = 1
      if (distance < 240) move = -1

      enemy.sprite.x +=
        Math.sin(enemy.sprite.rotation) *
        CONFIG.shooterSpeed * move * dt

      enemy.sprite.y -=
        Math.cos(enemy.sprite.rotation) *
        CONFIG.shooterSpeed * move * dt

      enemy.sprite.x = Math.max(
        48,
        Math.min(
          this.app.screen.width - 48,
          enemy.sprite.x
        )
      )

      enemy.sprite.y = Math.max(
        48,
        Math.min(
          this.app.screen.height - 48,
          enemy.sprite.y
        )
      )

      enemy.cooldown -= dt

      if (enemy.cooldown <= 0 && distance < 530) {
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

      bullet.sprite.x += bullet.vx * dt
      bullet.sprite.y += bullet.vy * dt

      bullet.distance += Math.hypot(
        bullet.vx,
        bullet.vy
      ) * dt

      let hit = false

      if (bullet.owner === 'player') {
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
      } else if (this.ship) {
        const distance = Math.hypot(
          bullet.sprite.x - this.ship.x,
          bullet.sprite.y - this.ship.y
        )

        if (distance < 33) {
          hit = true
          this.damagePlayer(CONFIG.shooterDamage)
        }
      }

      const outside =
        bullet.sprite.x < -30 ||
        bullet.sprite.y < -30 ||
        bullet.sprite.x > this.app.screen.width + 30 ||
        bullet.sprite.y > this.app.screen.height + 30

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
    if (!this.ship) return

    const dt = Math.min(
      this.app.ticker.deltaMS / 1000,
      0.05
    )

    this.updateExplosions(dt)

    if (!this.running) return

    this.elapsed += dt
    this.timeText.text =
      `TIME: ${Math.floor(this.elapsed)}`

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

    this.ship.x +=
      Math.sin(this.ship.rotation) *
      CONFIG.playerSpeed * movement * dt

    this.ship.y -=
      Math.cos(this.ship.rotation) *
      CONFIG.playerSpeed * movement * dt

    this.ship.x = Math.max(
      48,
      Math.min(
        this.app.screen.width - 48,
        this.ship.x
      )
    )

    this.ship.y = Math.max(
      48,
      Math.min(
        this.app.screen.height - 48,
        this.ship.y
      )
    )

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

    if (this.spawnTimer >= CONFIG.spawnInterval) {
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
  }

  destroy() {
    if (this.destroyed) return

    this.destroyed = true
    this.running = false

    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('blur', this.clearKeys)

    if (this.initialized) {
      this.app.ticker.remove(this.update)
      this.app.destroy(true, { children: true })
    }

    this.keys.clear()
  }
}
