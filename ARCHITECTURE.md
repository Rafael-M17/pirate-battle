# Pirate Battle — Architecture and Implementation Notes

## Overview

Pirate Battle separates React application screens and data management from the continuous PixiJS gameplay simulation.

```text
src/main.tsx
  ├─ React StrictMode + TanStack Query provider
  └─ MSW browser worker bootstrap
       └─ src/mocks/handlers.ts (intercepts /api/*)

src/App.tsx (menus, options, HUD-adjacent panels, touch controls,
             results, leaderboard, history, registration)
  ├─ src/game/Game.ts (PixiJS application, combat and simulation)
  │    ├─ src/game/Islands.ts (island geometry, collision/discovery)
  │    └─ src/game/GameRules.ts (end-of-match decisions)
  └─ src/api/*
       ├─ contracts.ts (typed records, pages, network scenarios)
       ├─ matchesApi.ts / http.ts (Axios REST calls)
       ├─ queryHooks.ts (TanStack Query queries and mutations)
       ├─ matchData.ts (ordering, fixtures and data helpers)
       └─ clientStorage.ts (browser persistence and pending queue)
```

## React and PixiJS boundaries

- `App.tsx` owns discrete UI state: menu navigation, options, match results, mission display, pause dialog, and mobile pointer controls.
- `Game.ts` owns continuously changing simulation state, the PixiJS stage, ship sprites, bullets, enemies, world position, timers, and weapon cooldowns.
- The game invokes callbacks for match completion, pause changes, and mission updates. The React app is not updated on each rendered frame.
- Touch button pointer events are forwarded to the active game instance and mapped to the same actions as keyboard controls. Pointer capture and release allow held movement and attack inputs. Inputs are cleared on appropriate interruption paths.

## Simulation and rendering

- PixiJS `Application` renders the ocean, islands, player, enemies, projectiles, health indicators, and minimap.
- `Game.start` initializes the renderer, creates the world, loads/reuses textures, and starts the ticker once initialization completes. A match has its own `Game` instance.
- The ticker advances the game using elapsed-time deltas rather than assuming a fixed number of pixels per frame. Weapon cooldowns, enemy behavior, and spawning are simulated using time values.
- `GameOptions` supplies session duration and spawn interval; `Game.ts` also holds balance constants for speed, health, range, damage, and cooldowns.
- The game camera follows the player while respecting world boundaries. The world is larger than the viewport so ships can navigate around islands on landscape mobile screens.
- `Islands.ts` defines island shapes and collision/discovery helpers. Movement and projectiles are checked against the island geometry rather than allowing passage through land. Combat uses separate cooldowns for the frontal weapon and side volleys.
- Enemies include chasing and ranged-shooting ship types. The game also renders fortified island cannons and mission progress.
- The minimap is drawn through PixiJS graphics; the compact mobile layout uses a circular presentation. The interface includes a portrait-orientation hint and touch controls for landscape devices.

## Lifecycle, pausing, and cleanup

- Starting or replaying a match initializes or replaces a game session and resets transient game state.
- Window focus loss or document visibility changes pause the simulation and clear held control inputs. Paused gameplay requires explicit user resumption.
- The React effect constructing `Game` has a cancellation guard for asynchronous initialization. Cleanup calls `game.destroy()`, and the game manages PixiJS resources, events, and ticker ownership.
- Because asset loading and renderer initialization are asynchronous, session cancellation is checked before continuing with gameplay setup.
- React StrictMode is enabled in the entry point; these guards are intended to prevent stale sessions from surviving remounts.

## REST contracts and data model

`src/api/contracts.ts` defines the typed `MatchRecord` structure:

- `matchId`, `playerId`, `playerName`
- `completedAt`, `score`, `durationSeconds`, `endReason`
- `configuration` (the match duration and spawn interval used)

A paginated response carries `items`, `page`, `pageSize`, `totalItems`, and `totalPages`. Leaderboard entries also contain a `rank`.

REST endpoints served by MSW:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/leaderboard` | Paginated ranking filtered by session configuration |
| `GET /api/matches` | Paginated match history filtered by player ID |
| `POST /api/matches` | Register a completed match |
| `POST /api/reset` | Reset mock demonstration data |

The browser worker is started in `src/main.tsx` before mounting React. The HTTP client uses Axios; TanStack Query manages read cache, request status, and query invalidation.

### Caching and freshness

- `useLeaderboard` keys queries by configuration, page, and simulated network scenario.
- `useMatchHistory` keys queries by player ID, page, and scenario.
- Read queries use a 15-second `staleTime` and one retry. The Query Client also supports refetching on window focus.
- Successful registration and reset invalidate the shared match-query namespace so relevant screens can refresh.
- Pagination is implemented at the mock handler level with a five-item default in the app API client.

### Persistence, retries, and idempotency

- `src/api/clientStorage.ts` wraps `localStorage` reads/writes for player identity, captain name, last result, pending submissions, registered IDs, and the active mock scenario.
- Game options are also saved locally by the React application.
- The registration client queues a match before the POST request. When the POST succeeds, it removes the pending entry. When the API returns an error, that entry remains eligible for retry.
- Registration sends an `Idempotency-Key` equal to `matchId`. The mock handler checks for an existing `matchId` and returns the original record rather than inserting a duplicate.
- The `REGISTER THEN TIMEOUT` scenario intentionally stores a match and returns a 504 on the first response, allowing demonstration of a safe retry.
- Confirmed records are stored in the mock browser storage and combined with fixture records for leaderboard queries. The demo is local to each browser: there is no remote multiuser database.

## Network failure demonstration

From **LEADERBOARD** or **MATCH HISTORY**, choose the scenario selector to simulate successful, empty, slow, out-of-order, error, network-failure, post-registration timeout, or unavailable-registration responses. Use **RESET DEMO DATA** to restore the demonstration state. Network errors do not stop locally simulated combat.

## Validation and tests

The existing `npm test` command runs Node.js unit tests in `tests/islands.test.mjs`, `tests/game-rules.test.mjs`, and `tests/match-data.test.mjs`. `npm run build` runs `tsc -b` and Vite; `npm run lint` runs ESLint.

**Not implemented as part of the documented repository version:** a Playwright E2E/visual-regression suite, baseline screenshots, E2E HTML/traces, and formal FPS/frame-p95 or five-cycle memory-profiling reports. No unmeasured 60 FPS or leak-free performance claims are made here.

## Design decisions, balance, and limitations

- Game duration defaults to 180 seconds (allowed 60–180); spawn interval defaults to 5 seconds (exposed range 1–30).
- Movement uses forward/backward thrust plus rotation, rather than free position dragging; touch and keyboard share the same intent mapping.
- The world is larger than the screen for navigation around islands; camera follow keeps the ship visible.
- The arena includes discoverable islands, collision boundaries, two enemy behaviors, and side/front weapons with separate reload timing.
- Leaderboard data is deterministic within the mock data helpers and is filtered by configuration for comparable results.
- Network behavior is simulated locally by MSW. The mock cannot provide cross-device account sync or a real backend uptime guarantee.
- Documentation describes the implemented structure and known testing gaps; additional E2E and profiling work would be required to satisfy every item in the original challenge specification.

## References

- [Source repository](https://github.com/Rafael-M17/pirate-battle)
- [Challenge specification](https://github.com/junglegaming/game-developer-challenge)
- [Deployed application](https://pirate-battle-rafael-m17.netlify.app/)
