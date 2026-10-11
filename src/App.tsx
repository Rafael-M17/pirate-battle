
import { useEffect, useRef, useState } from 'react'
import { Game, type GameResult } from './game/Game'
import './App.css'

function App() {
  const gameContainer = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameSession, setGameSession] = useState(0)

  useEffect(() => {
    if (!playing || !gameContainer.current) return

    const element = gameContainer.current
    const game = new Game()
    let cancelled = false

    void game.start(element, result => {
      if (!cancelled) setGameResult(result)
    }).then(() => {
      if (cancelled) game.destroy()
    })

    return () => {
      cancelled = true
    }
  }, [playing, gameSession])

  const playAgain = () => {
    setGameResult(null)
    setGameSession(session => session + 1)
  }

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
          key={gameSession}
          ref={gameContainer}
          className="gameCanvas"
        />
      )}
      {playing && gameResult && (
        <section
          className="resultOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resultTitle"
          aria-live="polite"
        >
          <div className="resultCard">
            <p className="resultEyebrow">
              {gameResult.outcome === 'victory'
                ? 'VICTORY'
                : 'VOYAGE ENDED'}
            </p>
            <h2 id="resultTitle">
              {gameResult.outcome === 'victory'
                ? 'BATTLE COMPLETE'
                : 'GAME OVER'}
            </h2>
            <p className="resultDescription">
              {gameResult.outcome === 'victory'
                ? 'The ocean is yours, captain.'
                : 'Your ship has been lost at sea.'}
            </p>
            <div className="resultStats">
              <div>
                <span>FINAL SCORE</span>
                <strong>{gameResult.score}</strong>
              </div>
              <div>
                <span>TIME SURVIVED</span>
                <strong>
                  {String(Math.floor(gameResult.survivedSeconds / 60))
                    .padStart(2, '0')}:
                  {String(gameResult.survivedSeconds % 60)
                    .padStart(2, '0')}
                </strong>
              </div>
            </div>
            <button className="primaryButton" onClick={playAgain}>
              PLAY AGAIN
            </button>
            <button
              className="secondaryButton"
              onClick={() => {
                setGameResult(null)
                setPlaying(false)
              }}
            >
              MAIN MENU
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
