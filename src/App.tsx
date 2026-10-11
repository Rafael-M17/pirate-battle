
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  DEFAULT_GAME_OPTIONS,
  Game,
  INITIAL_MISSION_PROGRESS,
  type GameOptions,
  type GameResult,
  type MissionProgress,
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
  const [missionProgress, setMissionProgress] = useState<MissionProgress>(
    { ...INITIAL_MISSION_PROGRESS }
  )
  const [objectivesCollapsed, setObjectivesCollapsed] = useState(false)
  const [islandNotice, setIslandNotice] = useState(false)
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameSession, setGameSession] = useState(0)
  const missionProgressHandlerRef = useRef<(
    progress: MissionProgress,
    discovered: boolean
  ) => void>((progress, discovered) => {
    flushSync(() => {
      setMissionProgress({ ...progress })
      if (discovered) setIslandNotice(true)
    })
  })

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options))
    } catch {
      // Settings remain usable for the current page when storage is unavailable.
    }
  }, [options])

  useEffect(() => {
    if (!islandNotice) return
    const timeout = window.setTimeout(() => setIslandNotice(false), 2200)
    return () => window.clearTimeout(timeout)
  }, [islandNotice])

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
    }, (progress, discovered) => {
      if (cancelled) return
      missionProgressHandlerRef.current(progress, discovered)
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
    setMissionProgress({ ...INITIAL_MISSION_PROGRESS })
    setIslandNotice(false)
    setGameSession(session => session + 1)
  }

  const startGame = () => {
    setGameResult(null)
    setPaused(false)
    setMissionProgress({ ...INITIAL_MISSION_PROGRESS })
    setIslandNotice(false)
    setPlaying(true)
  }

  const resetOptions = () => {
    setOptions({ ...DEFAULT_GAME_OPTIONS })
  }

  const returnToMainMenu = () => {
    setGameResult(null)
    setPaused(false)
    setPlaying(false)
  }

  const missionObjectives = [
    {
      label: 'ISLANDS DISCOVERED',
      progress: missionProgress.islandsDiscovered,
      total: missionProgress.islandsRequired,
    },
    {
      label: 'ENEMY SHIPS',
      progress: missionProgress.enemyShipsDefeated,
      total: missionProgress.enemyShipsRequired,
    },
    {
      label: 'FORT CANNONS',
      progress: missionProgress.fortCannonsDestroyed,
      total: missionProgress.fortCannonsRequired,
    },
  ]

  return (
    <main className={`game${!playing ? ' menuScreen' : ''}`}>
      {!playing ? (
        <>
          <div className="menuBackdrop" aria-hidden="true">
            <div className="menuIsland menuIslandNorth">
              <div className="islandLand" />
              <img className="islandPalm palmOne" src="/assets/png/default/tiles/tile_71.png" alt="" />
              <img className="islandPalm palmTwo" src="/assets/png/default/tiles/tile_71.png" alt="" />
              <img className="islandRock rockOne" src="/assets/png/default/tiles/tile_50.png" alt="" />
            </div>
            <div className="menuIsland menuIslandSouth">
              <div className="islandLand" />
              <img className="islandRock rockTwo" src="/assets/png/default/tiles/tile_50.png" alt="" />
              <img className="islandPalm palmThree" src="/assets/png/default/tiles/tile_71.png" alt="" />
            </div>
            <span className="shipWake wakeOne" />
            <span className="shipWake wakeTwo" />
            <img className="menuShip leadShip" src="/assets/png/default/ships/ship_2.png" alt="" />
            <img className="menuShip escortShip" src="/assets/png/default/ships/ship_12.png" alt="" />
            <img className="menuShip enemyShip" src="/assets/png/default/ships/ship_24.png" alt="" />
          </div>
          <div className="menu">
          <p className="menuEyebrow">JUNGLE GAMING PRESENTS</p>
          <h1 className="menuLogo">
            <img src="/assets/png/default/ui/menu/title_pirate_battle.png" alt="Pirate Battle" />
          </h1>
          <p className="menuTagline">Claim the islands. Silence the fortress. Rule the seas.</p>
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
              <button className="resetButton" onClick={resetOptions}>
                RESET TO DEFAULTS
              </button>
              <button className="secondaryButton" onClick={() => setShowOptions(false)}>
                BACK
              </button>
            </section>
          ) : (
            <div className="menuActions">
              <button onClick={startGame}>
                PLAY GAME
              </button>
              <button className="optionsButton" onClick={() => setShowOptions(true)}>
                OPTIONS
              </button>
            </div>
          )}
          {!showOptions && (
            <p className="voyageMeta">
              <span>SESSION</span>
              <strong>
                {String(Math.floor(options.matchDuration / 60)).padStart(2, '0')}:
                {String(options.matchDuration % 60).padStart(2, '0')}
              </strong>
              <span>3 OBJECTIVES</span>
            </p>
          )}
          <p className="footer">
            Jungle Gaming Developer Challenge
          </p>
          </div>
        </>
      ) : (
        <div
          key={gameSession}
          ref={gameContainer}
          className="gameCanvas"
        />
      )}
      {playing && !gameResult && (
        <>
          <section
            className={`missionPanel${objectivesCollapsed ? ' isCollapsed' : ''}`}
            aria-label="Mission objectives"
          >
            <header className="missionPanelHeader">
              <div>
                {!objectivesCollapsed && <span>ACTIVE MISSION</span>}
                <h2>CONQUEST OF THE SEAS</h2>
              </div>
              <button
                className="missionToggle"
                onClick={() => setObjectivesCollapsed(collapsed => !collapsed)}
                aria-label={objectivesCollapsed ? 'Expand objectives' : 'Collapse objectives'}
                aria-expanded={!objectivesCollapsed}
              >
                {objectivesCollapsed ? '+' : '\u2212'}
              </button>
            </header>
            {!objectivesCollapsed && (
              <ul className="missionList">
                {missionObjectives.map(objective => {
                  const complete = objective.progress >= objective.total
                  return (
                    <li
                      key={objective.label}
                      className={complete ? 'isComplete' : ''}
                    >
                      <span className="missionStatus" aria-hidden="true">
                        {complete ? '\u2713' : '\u2022'}
                      </span>
                      <span>{objective.label}</span>
                      <strong>{objective.progress}/{objective.total}</strong>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          {islandNotice && (
            <div className="islandNotice" role="status" aria-live="polite">
              ISLAND DISCOVERED!
            </div>
          )}
        </>
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
                : gameResult.outcome === 'time-up'
                  ? 'TIME UP'
                  : 'VOYAGE ENDED'}
            </p>
            <h2 id="resultTitle">
              {gameResult.outcome === 'victory'
                ? 'BATTLE COMPLETE'
                : gameResult.outcome === 'time-up'
                  ? 'TIME UP'
                  : 'GAME OVER'}
            </h2>
            <p className="resultDescription">
              {gameResult.outcome === 'victory'
                ? 'The ocean is yours, captain.'
                : gameResult.outcome === 'time-up'
                  ? 'The mission time has expired.'
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
