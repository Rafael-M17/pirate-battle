
import { useEffect, useRef, useState } from 'react'
import { Game } from './game/Game'
import './App.css'

function App() {
  const gameContainer = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || !gameContainer.current) return

    const element = gameContainer.current
    const game = new Game()
    let cancelled = false

    void game.start(element).then(() => {
      if (cancelled) game.destroy()
    })

    return () => {
      cancelled = true
    }
  }, [playing])

  return (
    <main className="game">
      {!playing ? (
        <div className="menu">
          <div className="flag">🏴‍☠️</div>
          <h1>PIRATE BATTLE</h1>
          <p>Prepare your ship for an epic naval battle.</p>
          <button onClick={() => setPlaying(true)}>
            PLAY GAME
          </button>
          <p className="footer">
            Jungle Gaming Developer Challenge
          </p>
        </div>
      ) : (
        <div
          ref={gameContainer}
          style={{ width: '100%', height: '100vh' }}
        />
      )}
    </main>
  )
}

export default App
