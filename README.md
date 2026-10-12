# Pirate Battle

A single-player, top-down naval combat game built for the [Jungle Gaming React & PixiJS challenge](https://github.com/junglegaming/game-developer-challenge).

**Live demo:** https://pirate-battle-rafael-m17.netlify.app/  
**Source code:** https://github.com/Rafael-M17/pirate-battle

## Technology

React 19, TypeScript, PixiJS 8, Vite, Axios, TanStack Query, and Mock Service Worker (MSW). The gameplay runs locally in the browser; leaderboard and match history requests go through simulated REST endpoints intercepted by MSW.

## Requirements and local setup

- Node.js and npm compatible with the project dependencies (a recent Node.js release is recommended; Node.js 22+ is a practical starting point).
- A modern desktop or mobile browser.
- No accounts, API tokens, or external backend services are needed.

From a clean checkout:

```bash
git clone https://github.com/Rafael-M17/pirate-battle.git
cd pirate-battle
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173/`). On Windows PowerShell, if `npm` is blocked by the PowerShell script policy, use `npm.cmd` in place of `npm`.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local development server |
| `npm run build` | TypeScript project build/type verification followed by optimized Vite build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the existing Node.js unit tests for island rules, game rules, and match data |

There is currently **no configured Playwright command or E2E suite** in `package.json`. Playwright/visual regression tests, HTML reports, traces, and performance profiling reports are **not included** in this documented version. Do not interpret the existing unit tests as E2E coverage.

## How to play

1. Select **PLAY GAME** from the main menu.
2. Navigate around islands, avoid enemies, and attack enemy ships.
3. Survive until the session timer reaches zero or the player's health runs out.
4. Review the result and optionally register it under a captain name to add it to local mock ranking/history data.
5. Use **PLAY AGAIN** to start a fresh session or **MAIN MENU** to return.

### Keyboard controls

| Key | Action |
| --- | --- |
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Turn left |
| `D` / `→` | Turn right |
| `Space` | Fire forward |
| `Q` | Fire to port (left) |
| `E` | Fire to starboard (right) |
| `Esc` | Pause/resume (resume requires user interaction) |

On a touch device, use the on-screen MOVE, BACK, LEFT, RIGHT, FIRE, PORT, and STARBOARD buttons. **Landscape orientation is recommended** for mobile play. Movement and firing controls support simultaneous input.

## Game options

Under **OPTIONS**:

- **GAME SESSION TIME:** 60–180 seconds; default 180 seconds.
- **ENEMY SPAWN INTERVAL:** 1–30 seconds; default 5 seconds.

Options are saved to browser `localStorage` and restored after refresh. A new match uses the options selected at its start. The game also includes discoverable islands, enemy ships, fortified island cannons, mission progress, a minimap, HUD, and manual/automatic pause on focus loss.

## Ranking, history, and simulated network conditions

Select **LEADERBOARD** or **MATCH HISTORY** from the main menu. Each screen has a **MOCK API SCENARIO** selector and a **RESET DEMO DATA** button.

Available scenarios:

| Scenario | How to reproduce |
| --- | --- |
| **SUCCESS** | Normal simulated API response. Use this for ordinary play and registration. |
| **EMPTY LISTS** | Leaderboard/history queries return empty pages. |
| **SLOW NETWORK** | Simulated reads take longer; loading feedback is visible. |
| **OUT-OF-ORDER PAGES** | The first page responds more slowly than later pages. Navigate between pages. |
| **RANKING ERROR** | Leaderboard requests return an error; retry from the error state. |
| **HISTORY ERROR** | History requests return an error; retry from the error state. |
| **NETWORK FAILURE** | Simulated network failures interrupt API operations. |
| **REGISTER THEN TIMEOUT** | The match is saved by the mock service, but its initial response is a timeout; retry the pending submission without creating a duplicate. |
| **REGISTRATION UNAVAILABLE** | Registration returns a service-unavailable response; the pending entry remains available for retry. |

To reproduce registration failures, choose the scenario in either data screen, return to the menu, play a full match, enter a captain name, and submit the result. Pending registrations can be retried from the menu after switching back to **SUCCESS**.

**RESET DEMO DATA** restores the mock data/scenario used for demonstration. The mock data lives in this browser's local storage; it is **not** a real shared server leaderboard. Another browser or device has separate data.

Mock API endpoints include `GET /api/leaderboard`, `GET /api/matches`, `POST /api/matches`, and `POST /api/reset`. Registration uses the match ID as an idempotency key. See [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.

## Environment variables and deployment

No custom environment variables are required for the current mock-only setup. MSW is initialized in `src/main.tsx`, with its worker located at `public/mockServiceWorker.js`. The same mock approach is used by the deployed build; there is no private backend dependency.

Deploy the output of `npm run build` (`dist/`) to a static hosting service configured for a Vite application. The current public deployment uses Netlify. For a local production smoke test:

```bash
npm run build
npm run preview
```

## Quality checks and current limitations

The repository includes unit tests under `tests/` for game-end conditions, island discovery/collision-related rules, and match data ordering/idempotency. The project also runs TypeScript verification as part of `npm run build` and ESLint through `npm run lint`.

**Known gaps relative to the full challenge brief:** Playwright E2E tests and versioned visual baselines have not been implemented or documented; reproducible frame-time/memory profiling evidence has not been collected. Treat the app as a browser-game demonstration rather than a production multiplayer system. Mock rankings persist locally per browser, not globally across devices.

## Assets and acknowledgements

Game sprites, textures, tiles, and UI artwork come from the assets supplied for the Jungle Gaming challenge. See the [original challenge repository](https://github.com/junglegaming/game-developer-challenge) for the supplied materials and their provenance. The project does not claim authorship of these third-party art assets; any further redistribution should follow the original assets' licensing terms.
