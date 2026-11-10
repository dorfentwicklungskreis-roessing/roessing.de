import { expect, test } from '@playwright/test'

// Hilfsfunktion zum Extrahieren der Schema.org-Daten
async function getSchemaOrgData(page: import('@playwright/test').Page) {
  const scriptContent = await page.evaluate(() => {
    const script = document.querySelector('script[type="application/ld+json"]')
    return script ? script.textContent : null
  })

  if (!scriptContent) {
    throw new Error('No script content found')
  }

  return JSON.parse(scriptContent)
}

test('Google Event Data', async ({ page }) => {
  // Volkstrauertag-Event hat ein Bild und testet alle Schema.org-Felder
  await page.goto('http://127.0.0.1:4321/events/2023-11-19-volkstrauertag')

  const jsonData = await getSchemaOrgData(page)

  // Assertions
  expect(jsonData).toHaveProperty('@context', 'https://schema.org')
  expect(jsonData).toHaveProperty('@type', 'Event')
  expect(typeof jsonData.name).toBe('string')
  expect(jsonData.location.name).toBe('Rössinger Ehrenmal')
  expect(jsonData.organizer.name).toBe('Ortsrat Rössing')
  expect(typeof jsonData.image).toBe('string')
})

test('eventStatus ist EventCompleted für vergangene Events', async ({
  page,
}) => {
  // Event aus 2023 ist definitiv vergangen
  await page.goto('http://127.0.0.1:4321/events/2023-12-02-weihnachtsmarkt')

  const jsonData = await getSchemaOrgData(page)

  expect(jsonData).toHaveProperty(
    'eventStatus',
    'https://schema.org/EventCompleted',
  )
})

test('eventStatus ist EventScheduled für zukünftige Events', async ({
  page,
}) => {
  // Event aus Dezember 2026 ist definitiv in der Zukunft
  await page.goto(
    'http://127.0.0.1:4321/events/2026-12-25-erster-weihnachtstag',
  )

  const jsonData = await getSchemaOrgData(page)

  expect(jsonData).toHaveProperty(
    'eventStatus',
    'https://schema.org/EventScheduled',
  )
})

test('eventStatus verwendet endDate wenn vorhanden, sonst startDate', async ({
  page,
}) => {
  // Das Weihnachtsmarkt-Event hat sowohl startDate als auch endDate
  // Da beide Daten in 2023 liegen, sollte es EventCompleted sein
  await page.goto('http://127.0.0.1:4321/events/2023-12-02-weihnachtsmarkt')

  const jsonData = await getSchemaOrgData(page)

  // Prüfen, dass das Event beide Datumsfelder hat
  expect(jsonData).toHaveProperty('startDate')
  expect(jsonData).toHaveProperty('endDate')
  // eventStatus sollte basierend auf endDate berechnet werden
  expect(jsonData).toHaveProperty(
    'eventStatus',
    'https://schema.org/EventCompleted',
  )
})

test('Unbekannte Veranstaltung liefert 404', async ({ request }) => {
  // Die Detailseiten werden im Worker gerendert; eine unbekannte id darf
  // keine leere Seite mit Status 200 ergeben.
  const antwort = await request.get(
    'http://127.0.0.1:4321/events/gibt-es-nicht',
  )
  expect(antwort.status()).toBe(404)
})
