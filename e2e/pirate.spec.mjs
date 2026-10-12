
import { test, expect } from '@playwright/test'

test('menu opens and offers game, options and records', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'PLAY GAME' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'OPTIONS' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'LEADERBOARD' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'MATCH HISTORY' })).toBeVisible()
})

test('options can be opened and reset', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'OPTIONS' }).click()

  await expect(page.getByRole('heading', { name: 'OPTIONS' })).toBeVisible()
  await expect(page.getByText('GAME SESSION TIME')).toBeVisible()
  await expect(page.getByText('ENEMY SPAWN INTERVAL')).toBeVisible()

  await page.getByRole('button', { name: 'RESET TO DEFAULTS' }).click()
  await page.getByRole('button', { name: 'BACK', exact: true }).click()

  await expect(page.getByRole('button', { name: 'PLAY GAME' })).toBeVisible()
})

test('game renders canvas, missions and can pause and resume', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'PLAY GAME' }).click()

  await expect(page.locator('.gameCanvas canvas')).toBeVisible({
    timeout: 30_000,
  })

  await expect(page.getByRole('button', { name: 'Pause game' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mission objectives' })).toBeVisible()

  await page.getByRole('button', { name: 'Pause game' }).click()
  await expect(page.getByRole('heading', { name: 'PAUSED' })).toBeVisible()

  await page.getByRole('button', { name: 'RESUME' }).click()
  await expect(page.getByRole('heading', { name: 'PAUSED' })).toHaveCount(0)

  await page.screenshot({
    path: `test-results/game-${test.info().project.name}.png`,
  })
})

test('mobile controls appear in landscape and mission toggle works', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-landscape-chromium',
    'Mobile-only test'
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'PLAY GAME' }).click()

  await expect(page.locator('.gameCanvas canvas')).toBeVisible({
    timeout: 30_000,
  })

  const controls = [
    'Move forward',
    'Move backward',
    'Turn left',
    'Turn right',
    'Fire front cannon',
    'Fire left broadside',
    'Fire right broadside',
  ]

  for (const control of controls) {
    await expect(
      page.getByRole('button', { name: control, exact: true })
    ).toBeVisible()
  }

  // O botão mantém esta classe mesmo quando muda de nome.
  const toggle = page.locator('.missionToggle')

  await expect(toggle).toBeVisible()

  // Descobre o estado inicial e fecha o painel, se necessário.
  if (await toggle.getAttribute('aria-expanded') === 'true') {
    await toggle.click()
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  // Abre as missões e confirma o resultado.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  // Fecha as missões e confirma novamente.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})
