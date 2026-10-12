
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { flushSync } from 'react-dom'
import {
  NETWORK_SCENARIOS,
  type MatchRecord,
  type NetworkScenario,
} from './api/contracts'
import {
  createMatchRecord,
} from './api/matchData'
import {
  getLastResult,
  getMockScenario,
  getPendingMatches,
  getPlayerId,
  getPlayerName,
  getRegisteredMatchIds,
  markMatchRegistered,
  saveLastResult,
  saveMockScenario,
  savePlayerName,
} from './api/clientStorage'
import { normalizePlayerName } from './api/matchData'
import {
  useLeaderboard,
  useMatchHistory,
  useRegisterMatch,
  useResetDemoData,
} from './api/queryHooks'
import {
  DEFAULT_GAME_OPTIONS,
  Game,
  INITIAL_MISSION_PROGRESS,
  type GameOptions,
  type GameResult,
  type MissionProgress,
  type TouchControl,
} from './game/Game'
import './App.css'

const OPTIONS_STORAGE_KEY = 'pirate-battle-options'

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:` +
    String(seconds % 60).padStart(2, '0')
}

function formatEndReason(reason: MatchRecord['endReason']) {
  return reason === 'time-up' ? 'TIME UP' : 'SHIP DESTROYED'
}

function NetworkScenarioControls({
  scenario,
  onChange,
  onReset,
  resetting,
}: {
  scenario: NetworkScenario
  onChange: (scenario: NetworkScenario) => void
  onReset: () => void
  resetting: boolean
}) {
  return (
    <div className="networkScenarioControls">
      <label>
        <span>MOCK API SCENARIO</span>
        <select
          value={scenario}
          onChange={event => onChange(event.target.value as NetworkScenario)}
        >
          {NETWORK_SCENARIOS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onReset} disabled={resetting}>
        {resetting ? 'RESETTING...' : 'RESET DEMO DATA'}
      </button>
    </div>
  )
}

function PageControls({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  return (
    <nav className="dataPagination" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        PREVIOUS
      </button>
      <span>PAGE {page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        NEXT
      </button>
    </nav>
  )
}

function LeaderboardScreen({
  configuration,
  page,
  scenario,
  onPageChange,
  onScenarioChange,
  onReset,
  resetting,
  onBack,
}: {
  configuration: GameOptions
  page: number
  scenario: NetworkScenario
  onPageChange: (page: number) => void
  onScenarioChange: (scenario: NetworkScenario) => void
  onReset: () => void
  resetting: boolean
  onBack: () => void
}) {
  const query = useLeaderboard(configuration, page, scenario)

  return (
    <section className="dataScreen" aria-labelledby="leaderboardTitle">
      <header className="dataScreenHeader">
        <div>
          <span>HALL OF CAPTAINS</span>
          <h2 id="leaderboardTitle">LEADERBOARD</h2>
          <small>SESSION {formatDuration(configuration.matchDuration)} · SPAWN {configuration.spawnInterval}s</small>
        </div>
        <button type="button" className="dataBackButton" onClick={onBack}>BACK</button>
      </header>
      <NetworkScenarioControls
        scenario={scenario}
        onChange={onScenarioChange}
        onReset={onReset}
        resetting={resetting}
      />
      {query.isPending ? (
        <p className="dataMessage" role="status">LOADING LEADERBOARD...</p>
      ) : query.isError ? (
        <div className="dataMessage dataError" role="alert">
          <p>LEADERBOARD COULD NOT BE LOADED.</p>
          <button type="button" onClick={() => void query.refetch()}>RETRY</button>
        </div>
      ) : query.data?.items.length === 0 ? (
        <p className="dataMessage">NO SCORES FOR THIS CONFIGURATION YET.</p>
      ) : (
        <>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead>
                <tr><th>RANK</th><th>CAPTAIN</th><th>SCORE</th><th>TIME</th><th>RESULT</th></tr>
              </thead>
              <tbody>
                {query.data?.items.map(entry => (
                  <tr key={entry.matchId}>
                    <td>#{entry.rank}</td>
                    <td><strong>{entry.playerName}</strong><small>{entry.playerId}</small></td>
                    <td className="tableScore">{entry.score}</td>
                    <td>{formatDuration(entry.durationSeconds)}</td>
                    <td>{formatEndReason(entry.endReason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageControls
            page={query.data?.page ?? page}
            totalPages={query.data?.totalPages ?? 1}
            onChange={onPageChange}
          />
          <p className="dataFootnote">TIES: SCORE, FASTEST TIME, EARLIEST FINISH, MATCH ID</p>
        </>
      )}
    </section>
  )
}

function MatchHistoryScreen({
  playerId,
  page,
  scenario,
  onPageChange,
  onScenarioChange,
  onReset,
  resetting,
  onBack,
}: {
  playerId: string
  page: number
  scenario: NetworkScenario
  onPageChange: (page: number) => void
  onScenarioChange: (scenario: NetworkScenario) => void
  onReset: () => void
  resetting: boolean
  onBack: () => void
}) {
  const query = useMatchHistory(playerId, page, scenario)

  return (
    <section className="dataScreen" aria-labelledby="historyTitle">
      <header className="dataScreenHeader">
        <div>
          <span>YOUR VOYAGES</span>
          <h2 id="historyTitle">MATCH HISTORY</h2>
        </div>
        <button type="button" className="dataBackButton" onClick={onBack}>BACK</button>
      </header>
      <NetworkScenarioControls
        scenario={scenario}
        onChange={onScenarioChange}
        onReset={onReset}
        resetting={resetting}
      />
      {query.isPending ? (
        <p className="dataMessage" role="status">LOADING MATCH HISTORY...</p>
      ) : query.isError ? (
        <div className="dataMessage dataError" role="alert">
          <p>MATCH HISTORY COULD NOT BE LOADED.</p>
          <button type="button" onClick={() => void query.refetch()}>RETRY</button>
        </div>
      ) : query.data?.items.length === 0 ? (
        <p className="dataMessage">NO MATCHES REGISTERED FOR THIS CAPTAIN.</p>
      ) : (
        <>
          <div className="dataTableWrap">
            <table className="dataTable">
              <thead>
                <tr><th>DATE</th><th>SCORE</th><th>DURATION</th><th>RESULT</th><th>SESSION</th></tr>
              </thead>
              <tbody>
                {query.data?.items.map(match => (
                  <tr key={match.matchId}>
                    <td>{new Date(match.completedAt).toLocaleString()}</td>
                    <td className="tableScore">{match.score}</td>
                    <td>{formatDuration(match.durationSeconds)}</td>
                    <td>{formatEndReason(match.endReason)}</td>
                    <td>{formatDuration(match.configuration.matchDuration)} / {match.configuration.spawnInterval}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageControls
            page={query.data?.page ?? page}
            totalPages={query.data?.totalPages ?? 1}
            onChange={onPageChange}
          />
        </>
      )}
    </section>
  )
}

function MatchRegistrationForm({
  playerName,
  nameError,
  isPending,
  isRegistered,
  onNameChange,
  onSubmit,
}: {
  playerName: string
  nameError: string
  isPending: boolean
  isRegistered: boolean
  onNameChange: (name: string) => void
  onSubmit: () => void
}) {
  return (
    <form
      className="matchRegistrationForm"
      onSubmit={event => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label>
        <span>CAPTAIN NAME</span>
        <input
          value={playerName}
          maxLength={24}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'playerNameError' : undefined}
          onChange={event => onNameChange(event.target.value)}
          placeholder="2-24 characters"
          disabled={isRegistered}
        />
      </label>
      {nameError && <p id="playerNameError" className="formError" role="alert">{nameError}</p>}
      <button type="submit" disabled={isPending || isRegistered}>
        {isRegistered ? 'RESULT REGISTERED' : isPending ? 'SAVING RESULT...' : 'REGISTER RESULT'}
      </button>
    </form>
  )
}

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
  const [menuView, setMenuView] = useState<'home' | 'leaderboard' | 'history'>('home')
  const [options, setOptions] = useState<GameOptions>(loadOptions)
  const [missionProgress, setMissionProgress] = useState<MissionProgress>(
    { ...INITIAL_MISSION_PROGRESS }
  )
  const [objectivesCollapsed, setObjectivesCollapsed] = useState(false)
  const [islandNotice, setIslandNotice] = useState(false)
  const [missionCompleteNotice, setMissionCompleteNotice] = useState(false)
  const [activeTouchControls, setActiveTouchControls] = useState<TouchControl[]>([])
  const activeTouchPointersRef = useRef(new Map<number, TouchControl>())
  const [gameResult, setGameResult] = useState<GameResult | null>(null)
  const [gameSession, setGameSession] = useState(0)
  const [playerId, setPlayerId] = useState(getPlayerId)
  const [playerName, setPlayerName] = useState(getPlayerName)
  const [nameError, setNameError] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [lastResult, setLastResult] = useState<GameResult | null>(getLastResult)
  const [registeredMatchIds, setRegisteredMatchIds] = useState(getRegisteredMatchIds)
  const [pendingMatches, setPendingMatches] = useState(getPendingMatches)
  const [networkScenario, setNetworkScenario] = useState<NetworkScenario>(getMockScenario)
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const registerMutation = useRegisterMatch()
  const resetMutation = useResetDemoData()
  const missionProgressHandlerRef = useRef<(
    progress: MissionProgress,
    discovered: boolean,
    objectivesCompleted: boolean
  ) => void>((progress, discovered, objectivesCompleted) => {
    flushSync(() => {
      setMissionProgress({ ...progress })
      if (discovered) setIslandNotice(true)
      if (objectivesCompleted) setMissionCompleteNotice(true)
    })
  })

  const refreshActiveTouchControls = () => {
    setActiveTouchControls([
      ...new Set(activeTouchPointersRef.current.values()),
    ])
  }

  const clearActiveTouchControls = () => {
    activeTouchPointersRef.current.clear()
    setActiveTouchControls([])
  }

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
    if (!missionCompleteNotice) return
    const timeout = window.setTimeout(
      () => setMissionCompleteNotice(false),
      2600
    )
    return () => window.clearTimeout(timeout)
  }, [missionCompleteNotice])

  useEffect(() => {
    if (!playing || !gameContainer.current) return

    const element = gameContainer.current
    const game = new Game({ ...options })
    gameRef.current = game
    let cancelled = false

    void game.start(element, result => {
      if (!cancelled) {
        clearActiveTouchControls()
        setPaused(false)
        setGameResult(result)
        setLastResult(result)
        saveLastResult(result)
        setSubmissionMessage('')
      }
    }, isPaused => {
      if (!cancelled) {
        setPaused(isPaused)
        if (isPaused) clearActiveTouchControls()
      }
    }, (progress, discovered, objectivesCompleted) => {
      if (cancelled) return
      missionProgressHandlerRef.current(
        progress,
        discovered,
        objectivesCompleted
      )
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

  const submitMatchRecord = (record: MatchRecord) => {
    setSubmissionMessage('')
    registerMutation.mutate(record, {
      onSuccess: () => {
        markMatchRegistered(record.matchId)
        setRegisteredMatchIds(getRegisteredMatchIds())
        setPendingMatches(getPendingMatches())
        setSubmissionMessage('RESULT SAVED TO HISTORY AND LEADERBOARD.')
      },
      onError: () => {
        setPendingMatches(getPendingMatches())
        setSubmissionMessage('REGISTRATION PENDING. RETRY WHEN THE API IS AVAILABLE.')
      },
    })
  }

  const submitCurrentResult = (result: GameResult | null = gameResult) => {
    if (!result) return
    if (registeredMatchIds.includes(result.matchId)) {
      setSubmissionMessage('THIS MATCH IS ALREADY REGISTERED.')
      return
    }

    const normalizedName = normalizePlayerName(playerName)
    if (!normalizedName) {
      setNameError('Enter a name between 2 and 24 characters.')
      return
    }

    setNameError('')
    setPlayerName(normalizedName)
    savePlayerName(normalizedName)
    submitMatchRecord(createMatchRecord(result, playerId, normalizedName))
  }

  const retryPendingMatch = (record: MatchRecord) => {
    submitMatchRecord(record)
  }

  const changeNetworkScenario = (scenario: NetworkScenario) => {
    saveMockScenario(scenario)
    setNetworkScenario(scenario)
    setLeaderboardPage(1)
    setHistoryPage(1)
  }

  const handleResetDemo = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setNetworkScenario('success')
        setLeaderboardPage(1)
        setHistoryPage(1)
        setPlayerId(getPlayerId())
        setPlayerName(getPlayerName())
        setLastResult(getLastResult())
        setPendingMatches(getPendingMatches())
        setRegisteredMatchIds(getRegisteredMatchIds())
      },
    })
  }

  const beginTouchControl = (
    event: ReactPointerEvent<HTMLButtonElement>,
    control: TouchControl
  ) => {
    event.preventDefault()
    if (paused || gameResult) return

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer may have been cancelled before capture was requested.
    }
    activeTouchPointersRef.current.set(event.pointerId, control)
    refreshActiveTouchControls()
    gameRef.current?.pressTouchControl(event.pointerId, control)
  }

  const endTouchControl = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    gameRef.current?.releaseTouchControl(event.pointerId)
    activeTouchPointersRef.current.delete(event.pointerId)
    refreshActiveTouchControls()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
          ) : menuView === 'leaderboard' ? (
            <LeaderboardScreen
              configuration={options}
              page={leaderboardPage}
              scenario={networkScenario}
              onPageChange={setLeaderboardPage}
              onScenarioChange={changeNetworkScenario}
              onReset={handleResetDemo}
              resetting={resetMutation.isPending}
              onBack={() => setMenuView('home')}
            />
          ) : menuView === 'history' ? (
            <MatchHistoryScreen
              playerId={playerId}
              page={historyPage}
              scenario={networkScenario}
              onPageChange={setHistoryPage}
              onScenarioChange={changeNetworkScenario}
              onReset={handleResetDemo}
              resetting={resetMutation.isPending}
              onBack={() => setMenuView('home')}
            />
          ) : (
            <div className="menuActions">
              <button onClick={startGame}>
                PLAY GAME
              </button>
              <button className="optionsButton" onClick={() => setShowOptions(true)}>
                OPTIONS
              </button>
              <button className="menuDataButton" onClick={() => setMenuView('leaderboard')}>
                LEADERBOARD
              </button>
              <button className="menuDataButton" onClick={() => setMenuView('history')}>
                MATCH HISTORY
              </button>
            </div>
          )}
          {!showOptions && menuView === 'home' && (
            <p className="voyageMeta">
              <span>SESSION</span>
              <strong>
                {String(Math.floor(options.matchDuration / 60)).padStart(2, '0')}:
                {String(options.matchDuration % 60).padStart(2, '0')}
              </strong>
              <span>3 OBJECTIVES</span>
            </p>
          )}
          {!showOptions && menuView === 'home' && lastResult && (
            <section className="lastResultPanel" aria-label="Last completed match">
              <div className="lastResultSummary">
                <span>LAST MATCH · {formatEndReason(lastResult.outcome)}</span>
                <strong>{lastResult.score} PTS · {formatDuration(lastResult.survivedSeconds)}</strong>
                <small>{registeredMatchIds.includes(lastResult.matchId) ? 'REGISTERED' : 'READY TO REGISTER'}</small>
              </div>
              {!registeredMatchIds.includes(lastResult.matchId) && (
                <MatchRegistrationForm
                  playerName={playerName}
                  nameError={nameError}
                  isPending={registerMutation.isPending}
                  isRegistered={false}
                  onNameChange={name => {
                    setPlayerName(name)
                    if (nameError) setNameError('')
                  }}
                  onSubmit={() => submitCurrentResult(lastResult)}
                />
              )}
              {submissionMessage && <p className="submissionMessage" role="status">{submissionMessage}</p>}
            </section>
          )}
          {pendingMatches.length > 0 && (
            <section className="pendingMatchesPanel" aria-label="Pending match submissions">
              <h3>PENDING SUBMISSIONS</h3>
              <p>Pending entries are saved on this device. You can still start another voyage.</p>
              {pendingMatches.map(match => (
                <div className="pendingMatchRow" key={match.matchId}>
                  <span>{match.playerName} · {match.score} PTS · {formatEndReason(match.endReason)}</span>
                  <button
                    type="button"
                    disabled={registerMutation.isPending}
                    onClick={() => retryPendingMatch(match)}
                  >
                    RETRY
                  </button>
                </div>
              ))}
            </section>
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
          {missionCompleteNotice && (
            <div className="missionCompleteNotice" role="status" aria-live="polite">
              ALL OBJECTIVES COMPLETE!
            </div>
          )}
          <aside className="controlInstructions" aria-label="Game controls">
            <span>KEYBOARD: WASD / ARROWS MOVE · SPACE FIRE · Q / E BROADSIDE</span>
            <span>TOUCH: STEER LEFT · ATTACK RIGHT</span>
          </aside>
          <div className="orientationHint" role="status">
            ROTATE DEVICE TO LANDSCAPE
          </div>
          <div
            className="touchControls"
            aria-label="Touch controls"
            onContextMenu={event => event.preventDefault()}
          >
            <div className="touchMovePad" aria-label="Movement controls">
              <button
                className="touchControl touchForward"
                aria-label="Move forward"
                aria-pressed={activeTouchControls.includes('forward')}
                onPointerDown={event => beginTouchControl(event, 'forward')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#9650;</span>
                <small>MOVE</small>
              </button>
              
<button
  className="touchControl touchBackward"
  aria-label="Move backward"
  aria-pressed={activeTouchControls.includes('backward')}
  onPointerDown={event => beginTouchControl(event, 'backward')}
  onPointerUp={endTouchControl}
  onPointerCancel={endTouchControl}
  onLostPointerCapture={endTouchControl}
>
  <span aria-hidden="true">&#9660;</span>
  <small>BACK</small>
</button>

              <button
                className="touchControl touchTurnLeft"
                aria-label="Turn left"
                aria-pressed={activeTouchControls.includes('turn-left')}
                onPointerDown={event => beginTouchControl(event, 'turn-left')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#8630;</span>
                <small>LEFT</small>
              </button>
              <button
                className="touchControl touchTurnRight"
                aria-label="Turn right"
                aria-pressed={activeTouchControls.includes('turn-right')}
                onPointerDown={event => beginTouchControl(event, 'turn-right')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#8631;</span>
                <small>RIGHT</small>
              </button>
            </div>
            <div className="touchAttackPad" aria-label="Attack controls">
              <button
                className="touchControl"
                aria-label="Fire left broadside"
                aria-pressed={activeTouchControls.includes('fire-left')}
                onPointerDown={event => beginTouchControl(event, 'fire-left')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#9664;</span>
                <small>PORT</small>
              </button>
              <button
                className="touchControl touchFrontFire"
                aria-label="Fire front cannon"
                aria-pressed={activeTouchControls.includes('fire-front')}
                onPointerDown={event => beginTouchControl(event, 'fire-front')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#9679;</span>
                <small>FIRE</small>
              </button>
              <button
                className="touchControl"
                aria-label="Fire right broadside"
                aria-pressed={activeTouchControls.includes('fire-right')}
                onPointerDown={event => beginTouchControl(event, 'fire-right')}
                onPointerUp={endTouchControl}
                onPointerCancel={endTouchControl}
                onLostPointerCapture={endTouchControl}
              >
                <span aria-hidden="true">&#9654;</span>
                <small>STARBOARD</small>
              </button>
            </div>
          </div>
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
              {gameResult.outcome === 'time-up' ? 'TIME UP' : 'SHIP DESTROYED'}
            </p>
            <h2 id="resultTitle">
              {gameResult.outcome === 'time-up' ? 'TIME UP' : 'SHIP DESTROYED'}
            </h2>
            <p className="resultDescription">
              {gameResult.outcome === 'time-up'
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
            <MatchRegistrationForm
              playerName={playerName}
              nameError={nameError}
              isPending={registerMutation.isPending}
              isRegistered={registeredMatchIds.includes(gameResult.matchId)}
              onNameChange={name => {
                setPlayerName(name)
                if (nameError) setNameError('')
              }}
              onSubmit={submitCurrentResult}
            />
            {submissionMessage && <p className="submissionMessage" role="status">{submissionMessage}</p>}
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
