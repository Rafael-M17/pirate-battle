
import {
  Application, Assets, Container, Graphics,
  Sprite, Text, type Texture,
} from 'pixi.js'

type Bullet = {
  sprite: Sprite
  vx: number
  vy: number
  distance: number
}

type Enemy = {
  sprite: Sprite
  health: number
  bar: Graphics
}

type Explosion = {
  sprite: Sprite
  time: number
}

export class Game {
  private app = new Application()
  private world = new Container()
  private ship: Sprite | null = null
  private ballTexture: Texture | null = null
  private enemyTexture: Texture | null = null
  private explosionTexture: Texture | null = null

  private keys = new Set<string>()
  private bullets: Bullet[] = []
  private enemies: Enemy[] = []
  private explosions: Explosion[] = []

  private scoreText = new Text({
    text: 'SCORE: 0',
    style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  })

  private lifeText = new Text({
    text: 'HP: 100',
    style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  })

  private score = 0
  private health = 100
  private frontCooldown = 0
  private leftCooldown = 0
  private rightCooldown = 0
  private spawnTimer = 0

  private readonly speed = 220
  private readonly rotationSpeed = 2.8
  private readonly bulletSpeed = 480
  private readonly bulletRange = 650

  private destroyed = false
  private initialized = false
  private running = false

  private keyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'q', 'e', ' ',
      'arrowup', 'arrowdown',
      'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault()
      this.keys.add(key)
    }
  }

  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase())
  }

  private clearKeys = () => this.keys.clear()

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

    const textures = await Promise.all([
      Assets.load<Texture>('/assets/png/default/ships/ship_2.png'),
      Assets.load<Texture>('/assets/png/default/ships/ship_8.png'),
      Assets.load<Texture>('/assets/png/default/ship_parts/cannon_ball.png'),
      Assets.load<Texture>('/assets/png/default/effects/explosion_2.png'),
    ])

    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }

    const [playerTexture, enemyTexture, ballTexture, explosionTexture] = textures

    this.enemyTexture = enemyTexture
    this.ballTexture = ballTexture
    this.explosionTexture = explosionTexture

    element.appendChild(this.app.canvas)
    this.app.stage.addChild(this.world)

    this.ship = new Sprite(playerTexture)
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
    this.lifeText.position.set(20, 48)
    this.app.stage.addChild(this.scoreText, this.lifeText)

    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('blur', this.clearKeys)

    this.running = true
    this.spawnEnemy()
    this.app.ticker.add(this.update)
  }

  private spawnEnemy() {
    if (!this.ship || !this.enemyTexture || !this.running) return

    const enemyShip = new Sprite(this.enemyTexture)
    enemyShip.anchor.set(0.5)
    enemyShip.width = 70
    enemyShip.height = 90
    enemyShip.scale.y *= -1

    // Spawn sufficiently far from the player
    const width = this.app.screen.width
    const height = this.app.screen.height
    const margin = 55

    let x = margin
    let y = margin
    let valid = false

    for (let i = 0; i < 30; i++) {
      x = margin + Math.random() * Math.max(1, width - margin * 2)
      y = margin + Math.random() * Math.max(1, height - margin * 2)

      if (Math.hypot(x - this.ship.x, y - this.ship.y) > 250) {
        valid = true
        break
      }
    }

    if (!valid) return

    enemyShip.position.set(x, y)

    const bar = new Graphics()
    this.world.addChild(enemyShip, bar)

    const enemy: Enemy = {
      sprite: enemyShip,
      health: 3,
      bar,
    }

    this.enemies.push(enemy)
    this.drawHealth(enemy)
  }

  private drawHealth(enemy: Enemy) {
    const bar = enemy.bar
    bar.clear()

    bar.rect(-30, -55, 60, 7)
    bar.fill('#691e1e')
    bar.rect(-30, -55, 60 * enemy.health / 3, 7)
    bar.fill('#35e66b')

    bar.position.set(enemy.sprite.x, enemy.sprite.y)
  }

  private explode(x: number, y: number) {
    if (!this.explosionTexture) return

    const sprite = new Sprite(this.explosionTexture)
    sprite.anchor.set(0.5)
    sprite.width = 85
    sprite.height = 85
    sprite.position.set(x, y)
    this.world.addChild(sprite)

    this.explosions.push({ sprite, time: 0.4 })
  }

  private removeEnemy(enemy: Enemy, scored: boolean) {
    this.explode(enemy.sprite.x, enemy.sprite.y)

    this.world.removeChild(enemy.sprite, enemy.bar)
    enemy.sprite.destroy()
    enemy.bar.destroy()

    this.enemies = this.enemies.filter(e => e !== enemy)

    if (scored) {
      this.score++
      this.scoreText.text = `SCORE: ${this.score}`
    }
  }

  private fire(side: 'front' | 'left' | 'right') {
    if (!this.ship || !this.ballTexture) return

    const angle = this.ship.rotation
    const fx = Math.sin(angle)
    const fy = -Math.cos(angle)
    const rx = Math.cos(angle)
    const ry = Math.sin(angle)

    const offsets = side === 'front' ? [0] : [-23, 0, 23]

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

      const vx = (side === 'front' ? fx : rx * sign) * this.bulletSpeed
      const vy = (side === 'front' ? fy : ry * sign) * this.bulletSpeed

      const sprite = new Sprite(this.ballTexture)
      sprite.anchor.set(0.5)
      sprite.width = 13
      sprite.height = 13
      sprite.position.set(x, y)

      this.world.addChild(sprite)
      this.bullets.push({ sprite, vx, vy, distance: 0 })
    }
  }

  private update = () => {
    if (!this.ship || !this.running) return

    const dt = Math.min(this.app.ticker.deltaMS / 1000, 0.05)

    this.frontCooldown = Math.max(0, this.frontCooldown - dt)
    this.leftCooldown = Math.max(0, this.leftCooldown - dt)
    this.rightCooldown = Math.max(0, this.rightCooldown - dt)

    // Player movement
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.ship.rotation -= this.rotationSpeed * dt
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.ship.rotation += this.rotationSpeed * dt
    }

    let direction = 0
    if (this.keys.has('w') || this.keys.has('arrowup')) direction++
    if (this.keys.has('s') || this.keys.has('arrowdown')) direction--

    this.ship.x += Math.sin(this.ship.rotation) * this.speed * direction * dt
    this.ship.y -= Math.cos(this.ship.rotation) * this.speed * direction * dt

    this.ship.x = Math.max(48, Math.min(this.app.screen.width - 48, this.ship.x))
    this.ship.y = Math.max(48, Math.min(this.app.screen.height - 48, this.ship.y))

    // Player weapons
    if (this.keys.has(' ') && this.frontCooldown <= 0) {
      this.fire('front')
      this.frontCooldown = 0.8
    }
    if (this.keys.has('q') && this.leftCooldown <= 0) {
      this.fire('left')
      this.leftCooldown = 2
    }
    if (this.keys.has('e') && this.rightCooldown <= 0) {
      this.fire('right')
      this.rightCooldown = 2
    }

    // Enemy spawning
    this.spawnTimer += dt
    if (this.spawnTimer >= 7) {
      this.spawnTimer = 0
      this.spawnEnemy()
    }

    // Chaser AI
    for (const enemy of [...this.enemies]) {
      const dx = this.ship.x - enemy.sprite.x
      const dy = this.ship.y - enemy.sprite.y
      const distance = Math.hypot(dx, dy)

      if (distance > 0) {
        const angle = Math.atan2(dx, -dy)
        let difference = Math.atan2(
          Math.sin(angle - enemy.sprite.rotation),
          Math.cos(angle - enemy.sprite.rotation)
        )

        const maxTurn = 2.2 * dt
        difference = Math.max(-maxTurn, Math.min(maxTurn, difference))
        enemy.sprite.rotation += difference

        enemy.sprite.x += Math.sin(enemy.sprite.rotation) * 115 * dt
        enemy.sprite.y -= Math.cos(enemy.sprite.rotation) * 115 * dt
      }

      this.drawHealth(enemy)

      if (distance < 48) {
        this.health = Math.max(0, this.health - 25)
        this.lifeText.text = `HP: ${this.health}`
        this.removeEnemy(enemy, false)

        if (this.health <= 0) {
          this.running = false
          this.clearKeys()
          this.lifeText.text = 'GAME OVER'
        }
      }
    }

    // Bullet movement and collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]
      bullet.sprite.x += bullet.vx * dt
      bullet.sprite.y += bullet.vy * dt
      bullet.distance += this.bulletSpeed * dt

      let hit = false

      for (const enemy of [...this.enemies]) {
        const d = Math.hypot(
          bullet.sprite.x - enemy.sprite.x,
          bullet.sprite.y - enemy.sprite.y
        )

        if (d < 36) {
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

      const outside =
        bullet.sprite.x < -30 ||
        bullet.sprite.y < -30 ||
        bullet.sprite.x > this.app.screen.width + 30 ||
        bullet.sprite.y > this.app.screen.height + 30

      if (hit || outside || bullet.distance >= this.bulletRange) {
        this.world.removeChild(bullet.sprite)
        bullet.sprite.destroy()
        this.bullets.splice(i, 1)
      }
    }

    // Temporary explosion animation
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]
      explosion.time -= dt
      explosion.sprite.alpha = Math.max(0, explosion.time / 0.4)

      if (explosion.time <= 0) {
        this.world.removeChild(explosion.sprite)
        explosion.sprite.destroy()
        this.explosions.splice(i, 1)
      }
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
