import { test, expect } from '@playwright/test';

/**
 * Mid-draft resume: make several picks, reload, assert the same board + pending draw.
 * Relies on session/localStorage persistence from src/lib/persist.ts.
 */
test('mid-draft resume restores picks and pending draw', async ({ page }) => {
  await page.goto('/');

  // Dismiss rules modal if present
  const rulesClose = page.getByRole('button', { name: /got it|close|ok/i });
  if (await rulesClose.first().isVisible().catch(() => false)) {
    await rulesClose.first().click();
  }

  await page.getByRole('button', { name: /start draft|new draft/i }).click();
  await expect(page.getByText(/formation|choose/i).first()).toBeVisible({ timeout: 60_000 });

  // Pick first formation card/button
  const formationButtons = page.locator('button').filter({ hasText: /\d-\d/ });
  await expect(formationButtons.first()).toBeVisible({ timeout: 30_000 });
  await formationButtons.first().click();

  // Captain pick — choose first card
  await expect(page.getByText(/captain/i).first()).toBeVisible({ timeout: 30_000 });
  const cards = page.locator('[data-testid="player-card"], button').filter({
    has: page.locator('img'),
  });
  // Fallback: click any large clickable in the pick band
  const pickBand = page.locator('.pick-band, [class*="pick"]').first();
  if (await pickBand.isVisible().catch(() => false)) {
    await pickBand.locator('button').first().click();
  } else {
    await cards.first().click({ timeout: 15_000 });
  }

  // Fill a few empty starter slots by clicking empties and picking first option
  for (let i = 0; i < 5; i++) {
    const empty = page.locator('[data-empty="true"], [aria-label*="empty" i]').first();
    if (!(await empty.isVisible().catch(() => false))) {
      // Try clicking unfilled pitch slots
      const slot = page.locator('[data-slot]').nth(i + 1);
      if (await slot.isVisible().catch(() => false)) await slot.click();
      else break;
    } else {
      await empty.click();
    }
    const option = page.locator('.pick-band button, [data-testid="card-option"]').first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
    } else {
      break;
    }
  }

  const before = await page.evaluate(() => {
    const raw =
      sessionStorage.getItem('ucl-draft:run') ?? localStorage.getItem('ucl-draft:run-backup');
    return raw;
  });
  expect(before).toBeTruthy();
  const parsed = JSON.parse(before!);
  const starterIds = (parsed.starters as (number | null)[]).filter((x) => x != null);
  expect(starterIds.length).toBeGreaterThanOrEqual(1);

  await page.reload();

  // Resume card or restored draft UI
  const resume = page.getByRole('button', { name: /resume/i });
  if (await resume.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await resume.click();
  }

  const after = await page.evaluate(() => {
    const raw =
      sessionStorage.getItem('ucl-draft:run') ?? localStorage.getItem('ucl-draft:run-backup');
    return raw;
  });
  expect(after).toBeTruthy();
  const restored = JSON.parse(after!);
  expect(restored.starters).toEqual(parsed.starters);
  expect(restored.pendingDraw).toEqual(parsed.pendingDraw);
  expect(restored.seed).toBe(parsed.seed);
  expect(restored.cursor).toBe(parsed.cursor);
});
