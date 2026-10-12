# Pirate Battle — Performance notes

## Environment

- Tested application: https://pirate-battle-rafael-m17.netlify.app/
- Browser: Google Chrome (desktop, responsive device emulation)
- Emulated viewport: 1288 × 531 CSS pixels
- Observation date: 2026-10-12 (Brazil local time)
- Measurement method: Chrome DevTools Rendering > Frame Rendering Stats, during an active match

## Observed snapshot

| Metric | Observation |
| --- | --- |
| Frame rate | 59.9 FPS (instantaneous on-screen reading) |
| Approximate frame interval | 16.7 ms (calculated as 1000 / 59.9; not a directly measured frame-time distribution) |
| GPU raster | On |
| GPU memory indicator | 1.1 MB used; 536.9 MB max shown by Chrome's overlay |

## Interpretation and limitations

The screenshot shows the game rendering close to 60 FPS at one observed moment. This is encouraging but **not** a sustained average or a benchmark across devices. The GPU memory overlay is **not** a JavaScript heap-memory measurement or the game's total memory footprint. The maximum shown is an overlay-reported limit, not allocated memory.

Not yet measured or verified: sustained average/minimum FPS; frame-time p95/p99; JavaScript heap size and trend; loading time; mobile hardware performance; results under different enemy counts. No numbers are asserted for those metrics.

## Reproduction

1. Open the published URL in Chrome.
2. Open DevTools, enable device emulation as needed, set 1288 × 531.
3. Under DevTools > Rendering, enable Frame Rendering Stats / FPS meter.
4. Start a match and observe the FPS overlay during active gameplay.
5. For a more representative profile, record a 30–60 second Performance trace with Chrome DevTools while moving and firing and inspect frame-time outliers.

## Automated functional checks (separate from performance)

- Unit tests: 9 passed in the latest reported run.
- Playwright E2E: 7 passed, 1 skipped, 0 failed in the latest reported run (8.6 seconds total). Desktop Chromium and mobile-landscape Chromium projects were exercised.

These are reported functional-test outcomes, not performance measurements. Refer to the Playwright report generated locally for detailed cases.
