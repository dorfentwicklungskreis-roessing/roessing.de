import { describe, expect, test } from 'vitest'
import { erstelleFeed, type FeedEingabe, istVorbei } from './feed'

const SITE = 'https://xn--rssing-wxa.de'
/** Fester „Jetzt"-Zeitpunkt, damit die Tests nicht mit der Uhr altern. */
const JETZT = new Date('2026-02-01T12:00:00+01:00')

const termin = (
  id: string,
  data: Partial<FeedEingabe['data']> = {},
  rest: Omit<Partial<FeedEingabe>, 'id' | 'data'> = {},
): FeedEingabe => ({
  id,
  data: {
    name: 'Offenes Dorfarchiv',
    description: 'Das Dorfarchiv ist für alle Interessierten geöffnet.',
    startDate: new Date('2026-03-03T17:00:00+01:00'),
    allDay: false,
    noindex: false,
    ...data,
  },
  ...rest,
})

const feedVon = (eingaben: FeedEingabe[]) =>
  erstelleFeed(eingaben, { site: SITE, jetzt: JETZT })

describe('Veranstaltungs-Feed (/events.json)', () => {
  test('Termine mit externer url verlinken dorthin statt auf die Detailseite', () => {
    const feed = feedVon([
      termin('2026-03-03-konzert', {
        url: 'https://kulturkreis-roessing.de/konzert',
      }),
    ])

    const [event] = feed.events
    expect(event?.url).toBe('https://kulturkreis-roessing.de/konzert')
    expect(event?.external).toBe(true)
    // Die interne Detailseite darf nirgends auftauchen — die externe Seite
    // ist die Primärquelle (siehe CLAUDE.md).
    expect(JSON.stringify(event)).not.toContain('/events/2026-03-03-konzert')
  })

  test('Termine ohne url bekommen den kanonischen Link auf die eigene Seite', () => {
    const feed = feedVon([termin('2026-03-03-dorfarchiv')])

    const [event] = feed.events
    expect(event?.url).toBe(`${SITE}/events/2026-03-03-dorfarchiv`)
    expect(event?.external).toBe(false)
  })

  test('Ganztägige Termine tragen nur ein Datum ohne Uhrzeit', () => {
    const feed = feedVon([
      termin('2026-03-14-umwelttag', {
        // So steht es im Frontmatter: `startDate: 2026-03-14`, `allDay: true`.
        startDate: new Date('2026-03-14T00:00:00Z'),
        allDay: true,
      }),
    ])

    const [event] = feed.events
    expect(event?.allDay).toBe(true)
    expect(event?.start).toBe('2026-03-14')
  })

  test('Termine mit Uhrzeit behalten die Ortszeit samt Offset', () => {
    const feed = feedVon([
      termin('2026-03-03-winterzeit', {
        startDate: new Date('2026-03-03T17:00:00+01:00'),
        endDate: new Date('2026-03-03T18:30:00+01:00'),
      }),
      termin('2026-07-01-sommerzeit', {
        startDate: new Date('2026-07-01T19:00:00+02:00'),
      }),
    ])

    const [winter, sommer] = feed.events
    expect(winter?.start).toBe('2026-03-03T17:00:00+01:00')
    expect(winter?.end).toBe('2026-03-03T18:30:00+01:00')
    // Sommerzeit: derselbe Ort, anderer Offset.
    expect(sommer?.start).toBe('2026-07-01T19:00:00+02:00')
  })

  test('Vergangene Termine stehen nicht im Feed', () => {
    const feed = feedVon([
      termin('2026-01-31-vorbei', {
        startDate: new Date('2026-01-31T19:00:00+01:00'),
      }),
      termin('2026-03-03-kommt', {
        startDate: new Date('2026-03-03T17:00:00+01:00'),
      }),
    ])

    expect(feed.events.map((e) => e.id)).toEqual(['2026-03-03-kommt'])
  })

  test('Ein Termin von heute bleibt bis zum Ende des Tages stehen', () => {
    // JETZT ist der 1.2.2026 um 12 Uhr — der Vormittagstermin von heute ist
    // gerade erst gewesen und gehört noch dazu.
    const feed = feedVon([
      termin('2026-02-01-heute-frueh', {
        startDate: new Date('2026-02-01T09:30:00+01:00'),
      }),
      termin('2026-02-01-ganztaegig', {
        startDate: new Date('2026-02-01T00:00:00Z'),
        allDay: true,
      }),
    ])

    // Ganztägige Termine beginnen um Mitternacht und stehen deshalb vor den
    // Terminen mit Uhrzeit desselben Tages.
    expect(feed.events.map((e) => e.id)).toEqual([
      '2026-02-01-ganztaegig',
      '2026-02-01-heute-frueh',
    ])
  })

  test('Termine sind aufsteigend nach Beginn sortiert', () => {
    const feed = feedVon([
      termin('spaet', { startDate: new Date('2026-05-01T10:00:00+02:00') }),
      termin('frueh', { startDate: new Date('2026-03-01T10:00:00+01:00') }),
      termin('mitte', { startDate: new Date('2026-04-01T10:00:00+02:00') }),
    ])

    expect(feed.events.map((e) => e.id)).toEqual(['frueh', 'mitte', 'spaet'])
  })

  test('Als noindex markierte Termine werden nicht ausgeliefert', () => {
    const feed = feedVon([
      termin('2026-03-03-intern', { noindex: true }),
      termin('2026-03-04-offen'),
    ])

    expect(feed.events.map((e) => e.id)).toEqual(['2026-03-04-offen'])
  })

  test('Ort und Veranstalter kommen mit, Koordinaten wenn vorhanden', () => {
    const feed = feedVon([
      termin(
        '2026-03-03-dorfarchiv',
        {},
        {
          location: {
            name: 'Dorfgemeinschaftshaus Rössing',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Kirchstraße 3',
              postalCode: '31171',
              addressLocality: 'Nordstemmen',
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: 52.1843,
              longitude: 9.8162,
            },
          },
          organizer: { name: 'Dorfpflege Rössing', '@type': 'Organization' },
        },
      ),
    ])

    const [event] = feed.events
    expect(event?.location).toEqual({
      name: 'Dorfgemeinschaftshaus Rössing',
      address: 'Kirchstraße 3, 31171 Nordstemmen',
      lat: 52.1843,
      lon: 9.8162,
    })
    expect(event?.organizer).toEqual({ name: 'Dorfpflege Rössing' })
  })

  test('Ein Ort ohne Koordinaten trägt keine leeren Felder', () => {
    const feed = feedVon([
      termin('2026-03-03-dorfarchiv', {}, { location: { name: 'Rössing' } }),
    ])

    expect(feed.events[0]?.location).toEqual({ name: 'Rössing' })
  })

  test('Der Feed nennt sein Format und den Zeitpunkt der Erzeugung', () => {
    const feed = feedVon([termin('2026-03-03-dorfarchiv')])

    expect(feed.version).toBe(1)
    expect(feed.generatedAt).toBe('2026-02-01T11:00:00.000Z')
  })
})

describe('istVorbei', () => {
  // Startseite und /events werden im Worker gerendert, der in UTC läuft. Das
  // Tagesende muss trotzdem nach deutscher Ortszeit bestimmt werden.
  const martinsumzug = { startDate: new Date('2026-11-11T18:00:00+01:00') }

  test('ein Termin ist am eigenen Tag noch nicht vorbei, auch nach Beginn', () => {
    expect(istVorbei(martinsumzug, new Date('2026-11-11T22:30:00+01:00'))).toBe(
      false,
    )
  })

  test('kurz vor Mitternacht Ortszeit ist er noch nicht vorbei', () => {
    // 23:59 in Rössing = 22:59 UTC
    expect(istVorbei(martinsumzug, new Date('2026-11-11T22:59:00Z'))).toBe(
      false,
    )
  })

  test('ab Mitternacht Ortszeit ist er vorbei – auch wenn es in UTC noch der 11. ist', () => {
    // 00:30 am 12.11. in Rössing = 23:30 UTC am 11.11.
    expect(istVorbei(martinsumzug, new Date('2026-11-11T23:30:00Z'))).toBe(true)
  })

  test('bei mehrtägigen Terminen zählt das Enddatum', () => {
    expect(
      istVorbei(
        {
          startDate: new Date('2026-11-10T10:00:00+01:00'),
          endDate: new Date('2026-11-12T18:00:00+01:00'),
        },
        new Date('2026-11-12T20:00:00+01:00'),
      ),
    ).toBe(false)
  })
})
