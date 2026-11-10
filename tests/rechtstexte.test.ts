import { expect, test } from '@playwright/test'

const BASE_URL = 'http://127.0.0.1:4321'

// Externe Ressourcen (Analytics) blockieren, damit die Tests unabhängig von
// der Netzwerkverbindung laufen.
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort())
})

test('Impressum und Datenschutz sind im Footer jeder Seite verlinkt', async ({
  page,
}) => {
  for (const path of ['/', '/events', '/projekte']) {
    // domcontentloaded genügt: das Analytics-Skript liegt auf einer externen
    // Domain und darf den Test nicht blockieren.
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' })

    const footer = page.locator('footer')
    await expect(
      footer.getByRole('link', { name: 'Impressum' }),
    ).toHaveAttribute('href', '/impressum')
    await expect(
      footer.getByRole('link', { name: 'Datenschutz' }),
    ).toHaveAttribute('href', '/datenschutz')
  }
})

test('Impressum ist über den Footer erreichbar', async ({ page }) => {
  await page.goto(BASE_URL)
  await page.locator('footer').getByRole('link', { name: 'Impressum' }).click()

  await expect(page).toHaveURL(new RegExp(`^${BASE_URL}/impressum/?$`))
  await expect(page.getByRole('heading', { name: 'Impressum' })).toBeVisible()
})

test('Datenschutzerklärung ist über den Footer erreichbar', async ({
  page,
}) => {
  await page.goto(BASE_URL)
  await page
    .locator('footer')
    .getByRole('link', { name: 'Datenschutz' })
    .click()

  await expect(page).toHaveURL(new RegExp(`^${BASE_URL}/datenschutz/?$`))
  await expect(
    page.getByRole('heading', { name: 'Datenschutzerklärung' }),
  ).toBeVisible()
})

test('Alter Pfad /imprint leitet auf /impressum weiter', async ({ page }) => {
  await page.goto(`${BASE_URL}/imprint`)

  await expect(page).toHaveURL(new RegExp(`^${BASE_URL}/impressum/?$`))
})
