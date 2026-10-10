
import {
  Application,
  Assets,
  Container,
  Sprite,
  type Texture,
} from 'pixi.js'

type Cannonball = {
  sprite: Sprite
  vx: number
  vy: number
  distance: number
}

export class Game {
  private app = new Application()
  private world = new Container()
  private ship: Sprite | null = null
  private cannonballTexture: Texture | null = null

  private keys = new Set<string>()
  private cannonballs: Cannonball[] = []

  private readonly speed = 220
  private readonly rotationSpeed = 2.8
  private readonly bulletSpeed = 480
  private readonly bulletRange = 650

  // Independent weapon cooldowns
  private frontCooldown = 0
  private leftCooldown = 0
  private rightCooldown = 0

  private destroyed = false
  private initialized = false

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if ([
      'w', 'a', 's', 'd',
      'arrowup', 'arrowdown',
      'arrowleft', 'arrowright',
      'q', 'e', ' ',
    ].includes(key)) {
      event.preventDefault()
      this.keys.add(key)
    }
  }

  private handleKeyUp = (event: KeyboardEvent) => {
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

    const [shipTexture, ballTexture] = await Promise.all([
      Assets.load<Texture>(
        '/assets/png/default/ships/ship_2.png'
      ),
      Assets.load<Texture>(
        '/assets/png/default/ship_parts/cannon_ball.png'
      ),
    ])

    if (this.destroyed) {
      this.app.destroy(true, { children: true })
      return
    }

    this.cannonballTexture = ballTexture

    element.appendChild(this.app.canvas)
    this.app.stage.addChild(this.world)

    this.ship = new Sprite(shipTexture)
    this.ship.anchor.set(0.5)
    this.ship.width = 75
    this.ship.height = 95
    this.ship.scale.y *= -1

    this.ship.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2
    )

    this.world.addChild(this.ship)

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.clearKeys)

    this.app.ticker.add(this.update)
  }

  private fireCannon(
    side: 'front' | 'left' | 'right'
  ) {
    if (!this.ship || !this.cannonballTexture) return

    const angle = this.ship.rotation

    const forwardX = Math.sin(angle)
    const forwardY = -Math.cos(angle)

    const rightX = Math.cos(angle)
    const rightY = Math.sin(angle)

    const offsets = side === 'front'
      ? [0]
      : [-23, 0, 23]

    for (const offset of offsets) {
      let x = this.ship.x
      let y = this.ship.y
      let directionX = forwardX
      let directionY = forwardY

      if (side === 'front') {
        x += forwardX * 42
        y += forwardY * 42
      } else {
        const sideSign = side === 'right' ? 1 : -1

        x += rightX * 29 * sideSign
        y += rightY * 29 * sideSign

        x += forwardX * offset
        y += forwardY * offset

        directionX = rightX * sideSign
        directionY = rightY * sideSign
      }

      const sprite = new Sprite(this.cannonballTexture)

      sprite.anchor.set(0.5)
      sprite.width = 13
      sprite.height = 13
      sprite.position.set(x, y)

      this.world.addChild(sprite)

      this.cannonballs.push({
        sprite,
        vx: directionX * this.bulletSpeed,
        vy: directionY * this.bulletSpeed,
        distance: 0,
      })
    }
  }

  private update = () => {
    if (!this.ship) return

    const dt = Math.min(
      this.app.ticker.deltaMS / 1000,
      0.05
    )

    // Reduce cooldowns independently
    this.frontCooldown = Math.max(
      0, this.frontCooldown - dt
    )

    this.leftCooldown = Math.max(
      0, this.leftCooldown - dt
    )

    this.rightCooldown = Math.max(
      0, this.rightCooldown - dt
    )

    // Rotation
    if (
      this.keys.has('a') ||
      this.keys.has('arrowleft')
    ) {
      this.ship.rotation -= this.rotationSpeed * dt
    }

    if (
      this.keys.has('d') ||
      this.keys.has('arrowright')
    ) {
      this.ship.rotation += this.rotationSpeed * dt
    }

    // Movement
    let direction = 0

    if (
      this.keys.has('w') ||
      this.keys.has('arrowup')
    ) {
      direction += 1
    }

    if (
      this.keys.has('s') ||
      this.keys.has('arrowdown')
    ) {
      direction -= 1
    }

    this.ship.x += Math.sin(this.ship.rotation)
      * this.speed * direction * dt

    this.ship.y -= Math.cos(this.ship.rotation)
      * this.speed * direction * dt

    // Screen boundaries
    const margin = 48

    this.ship.x = Math.max(
      margin,
      Math.min(
        this.app.screen.width - margin,
        this.ship.x
      )
    )

    this.ship.y = Math.max(
      margin,
      Math.min(
        this.app.screen.height - margin,
        this.ship.y
      )
    )

    // Front cannon: SPACE
    if (
      this.keys.has(' ') &&
      this.frontCooldown <= 0
    ) {
      this.fireCannon('front')
      this.frontCooldown = 0.8
    }

    // Left cannons: Q
    if (
      this.keys.has('q') &&
      this.leftCooldown <= 0
    ) {
      this.fireCannon('left')
      this.leftCooldown = 2
    }

    // Right cannons: E
    if (
      this.keys.has('e') &&
      this.rightCooldown <= 0
    ) {
      this.fireCannon('right')
      this.rightCooldown = 2
    }

    // Update cannonballs
    for (
      let i = this.cannonballs.length - 1;
      i >= 0;
      i--
    ) {
      const ball = this.cannonballs[i]

      ball.sprite.x += ball.vx * dt
      ball.sprite.y += ball.vy * dt

      ball.distance += this.bulletSpeed * dt

      const outside =
        ball.sprite.x < -30 ||
        ball.sprite.y < -30 ||
        ball.sprite.x > this.app.screen.width + 30 ||
        ball.sprite.y > this.app.screen.height + 30

      if (
        ball.distance >= this.bulletRange ||
        outside
      ) {
        this.world.removeChild(ball.sprite)
        ball.sprite.destroy()
        this.cannonballs.splice(i, 1)
      }
    }
  }

  destroy() {
    if (this.destroyed) return

    this.destroyed = true

    window.removeEventListener(
      'keydown', this.handleKeyDown
    )
    window.removeEventListener(
      'keyup', this.handleKeyUp
    )
    window.removeEventListener(
      'blur', this.clearKeys
    )

    if (this.initialized) {
      this.app.ticker.remove(this.update)
      this.app.destroy(true, { children: true })
    }

    this.keys.clear()
    this.cannonballs = []
  }
}
