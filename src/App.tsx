
import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_GAME_OPTIONS,
  Game,
  type GameOptions,
  type GameResult,
} from './game/Game'
import './App.css'

const OPTIONS_STORAGE_KEY = 'pirate-battle-options'

function loadOptions(): GameOptions {
  try {
    const saved = JSON.parse(
      localStorage.getItem(OPTIONS_STORAGE_KEY) ?? 'null'
    ) as Partial<GameOptions> | null
    if (!saved) return { ...DEFAULT_GAME_OPTIONS }

    return {
      matchDuration: Number.isFinite(saved.matchDuration)
        ? Math.min(180, Math.max(60, saved.matchDuration!))
        : DEFAULT_GAME_OPTIONS.matchDuration,
      spawnInterval: Number.isFinite(saved.spawnInterval)
        ? Math.min(30, Math.max(1, saved.spawnInterval!))
        : DEFAULT_GAME_OPTIONS.spawnInterval,
    }
  } catch {
    return { ...DEFAULT_GAME_OPTIONS }
  }
}

function App() {
  const gameContainer = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState<GameOptions>(loadOptions)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameSession, setGameSession] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options))
    } catch {
      // Settings remain usable for the current page when storage is unavailable.
    }
  }, [options])

  useEffect(() => {
    if (!playing || !gameContainer.current) return

    const element = gameContainer.current
    const game = new Game({ ...options })
    gameRef.current = game
    let cancelled = false

    void game.start(element, result => {
      if (!cancelled) {
        setPaused(false)
        setGameResult(result)
      }
    }, isPaused => {
      if (!cancelled) setPaused(isPaused)
    }).then(() => {
      if (cancelled) game.destroy()
    })

    return () => {
      cancelled = true
      game.destroy()
      if (gameRef.current === game) gameRef.current = null
    }
  }, [playing, gameSession, options])

  const playAgain = () => {
    setGameResult(null)
    setPaused(false)
    setGameSession(session => session + 1)
  }

  const returnToMainMenu = () => {
    setGameResult(null)
    setPaused(false)
    setPlaying(false)
  }

  return (
    <main className="game">
      {!playing ? (
        <div className="menu">
          <div className="flag">🏴‍☠️</div>
          <h1>PIRATE BATTLE</h1>
          <p>Prepare your ship for an epic naval battle.</p>
          {showOptions ? (
            <section className="optionsPanel" aria-labelledby="optionsTitle">
              <h2 id="optionsTitle">OPTIONS</h2>
              <label className="settingControl">
                <span>GAME SESSION TIME</span>
                <strong>{options.matchDuration} SECONDS</strong>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="1"
                  value={options.matchDuration}
                  onChange={event => setOptions(current => ({
                    ...current,
                    matchDuration: Number(event.target.value),
                  }))}
                />
                <small>60-180 seconds</small>
              </label>
              <label className="settingControl">
                <span>ENEMY SPAWN INTERVAL</span>
                <strong>{options.spawnInterval} SECONDS</strong>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={options.spawnInterval}
                  onChange={event => setOptions(current => ({
                    ...current,
                    spawnInterval: Number(event.target.value),
                  }))}
                />
                <small>1-30 seconds</small>
              </label>
              <button className="secondaryButton" onClick={() => setShowOptions(false)}>
                BACK
              </button>
            </section>
          ) : (
            <>
              <button onClick={() => setPlaying(true)}>
                PLAY GAME
              </button>
              <button className="optionsButton" onClick={() => setShowOptions(true)}>
                OPTIONS
              </button>
            </>
          )}
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
            <button className="secondaryButton" onClick={returnToMainMenu}>
              MAIN MENU
            </button>
          </div>
        </section>
      )}
      {playing && !gameResult && (
        <>
          <button
            className="pauseButton"
            onClick={() => gameRef.current?.pause()}
            aria-label="Pause game"
          >
            PAUSE
          </button>
          {paused && (
            <section
              className="resultOverlay pauseOverlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pauseTitle"
            >
              <div className="resultCard">
                <p className="resultEyebrow">VOYAGE ON HOLD</p>
                <h2 id="pauseTitle">PAUSED</h2>
                <button className="primaryButton" onClick={() => gameRef.current?.resume()}>
                  RESUME
                </button>
                <button className="secondaryButton" onClick={returnToMainMenu}>
                  MAIN MENU
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default App
