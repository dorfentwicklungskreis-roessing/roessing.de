/**
 * Der Veranstaltungs-Feed, der beim Build als `/events.json` herausfällt.
 *
 * Zweck: Die Veranstaltungen werden genau einmal gepflegt — hier, in
 * `src/content/events/`. Wer sie sonst noch zeigen möchte (die Dorf-App zum
 * Beispiel), holt sie sich von dort, statt sie ein zweites Mal einzutragen.
 *
 * Die Regeln stehen bewusst in einer eigenen, Astro-freien Datei: So lassen
 * sie sich mit Vitest prüfen, ohne die Seite zu bauen.
 */

const ZEITZONE = 'Europe/Berlin'

/**
 * Ein Ort, wie er in `src/data/locations/*.yaml` steht (schema.org Place).
 * Die `@type`-Angaben werden mitgenommen, aber nicht ausgewertet.
 */
export interface EingabeOrt {
  name: string
  '@type'?: string | undefined
  address?:
    | {
        '@type'?: string | undefined
        streetAddress?: string | undefined
        postalCode?: string | undefined
        addressLocality?: string | undefined
      }
    | undefined
  geo?:
    | { '@type'?: string | undefined; latitude: number; longitude: number }
    | undefined
  url?: string | undefined
}

/** Ein Veranstalter aus `src/data/organizers/*.yaml`. */
export interface EingabeVeranstalter {
  name: string
  '@type'?: string | undefined
  url?: string | undefined
}

/** Ein Termin mit bereits aufgelöstem Ort und Veranstalter. */
export interface FeedEingabe {
  id: string
  data: {
    name: string
    description: string
    startDate: Date
    endDate?: Date | undefined
    allDay?: boolean | undefined
    url?: string | undefined
    noindex?: boolean | undefined
  }
  location?: EingabeOrt | undefined
  organizer?: EingabeVeranstalter | undefined
  /** Vollständige URL eines bereits optimierten Bildes. */
  image?: string | undefined
}

export interface FeedOrt {
  name: string
  /** Einzeilige Anschrift, wenn eine hinterlegt ist. */
  address?: string
  lat?: number
  lon?: number
}

export interface FeedVeranstalter {
  name: string
}

export interface FeedTermin {
  id: string
  name: string
  description: string
  /**
   * Beginn. Ganztägig: nur das Datum (`2026-03-14`). Sonst die Ortszeit
   * samt Offset (`2026-03-14T09:30:00+01:00`) — nie ohne Offset, sonst
   * rät die Gegenseite.
   */
  start: string
  end?: string
  allDay: boolean
  /**
   * Wohin der Termin gehört: die externe Primärquelle, falls im Frontmatter
   * eine `url` steht, sonst die Detailseite auf rössing.de.
   */
  url: string
  /** true = die Seite gehört jemand anderem (siehe `url`-Regel in CLAUDE.md). */
  external: boolean
  location?: FeedOrt
  organizer?: FeedVeranstalter
  image?: string
}

export interface EventsFeed {
  /** Formatstand. Wird erhöht, wenn sich die Bedeutung von Feldern ändert. */
  version: 1
  generatedAt: string
  events: FeedTermin[]
}

interface Optionen {
  /** Ursprung der Seite, z.B. `https://xn--rssing-wxa.de`. */
  site: string
  /** „Jetzt" — als Parameter, damit Tests nicht mit der Uhr altern. */
  jetzt: Date
}

const teile = (datum: Date) => {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZEITZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(
    format.formatToParts(datum).map((teil) => [teil.type, teil.value]),
  ) as Record<string, string>
}

/** Der Offset der Ortszeit an diesem Tag: `+01:00` im Winter, `+02:00` im Sommer. */
const offset = (datum: Date): string => {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: ZEITZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(datum)
    .find((teil) => teil.type === 'timeZoneName')?.value
  // "GMT+01:00" → "+01:00"; zur Sicherheit auch "GMT" (dann UTC).
  return name?.replace('GMT', '') || '+00:00'
}

/** Nur das Datum in Ortszeit — für ganztägige Termine. */
export const alsDatum = (datum: Date): string => {
  const t = teile(datum)
  return `${t.year}-${t.month}-${t.day}`
}

/** Ortszeit mit Offset — für Termine mit Uhrzeit. */
export const alsZeitpunkt = (datum: Date): string => {
  const t = teile(datum)
  return `${t.year}-${t.month}-${t.day}T${t.hour}:${t.minute}:${t.second}${offset(datum)}`
}

const zeit = (datum: Date, allDay: boolean) =>
  allDay ? alsDatum(datum) : alsZeitpunkt(datum)

/**
 * Ein Termin gilt erst als vorbei, wenn sein letzter Tag zu Ende ist. Ein
 * Fest, das um 19 Uhr angefangen hat, verschwindet sonst um 19:01 aus der
 * Liste — obwohl man noch hingehen könnte. Dieselbe Regel gilt für die
 * Startseite, `/events` und die Detailseite.
 */
export const istVorbei = (
  termin: { startDate: Date; endDate?: Date | undefined },
  jetzt: Date,
): boolean => {
  const ende = termin.endDate ?? termin.startDate
  const letzterTag = alsDatum(ende)
  return alsDatum(jetzt) > letzterTag
}

const anschrift = (ort: EingabeOrt): string | undefined => {
  const adresse = ort.address
  if (!adresse) return undefined
  const strasse = adresse.streetAddress?.trim()
  const stadt = [adresse.postalCode, adresse.addressLocality]
    .filter(Boolean)
    .join(' ')
    .trim()
  const zeilen = [strasse, stadt].filter(Boolean)
  return zeilen.length > 0 ? zeilen.join(', ') : undefined
}

const alsOrt = (ort: EingabeOrt): FeedOrt => {
  const adresse = anschrift(ort)
  return {
    name: ort.name,
    ...(adresse ? { address: adresse } : {}),
    // Koordinaten sind freiwillig; ohne sie taucht der Termin eben auf keiner
    // Karte auf, statt auf einer falschen Stelle zu landen.
    ...(ort.geo ? { lat: ort.geo.latitude, lon: ort.geo.longitude } : {}),
  }
}

const alsTermin = (eingabe: FeedEingabe, site: string): FeedTermin => {
  const { data } = eingabe
  const allDay = data.allDay ?? false
  return {
    id: eingabe.id,
    name: data.name,
    description: data.description,
    start: zeit(data.startDate, allDay),
    ...(data.endDate ? { end: zeit(data.endDate, allDay) } : {}),
    allDay,
    // Steht eine externe url im Frontmatter, ist die externe Seite die
    // Primärquelle: Dann wird dorthin verlinkt und die eigene Detailseite
    // bleibt außen vor (dieselbe Regel wie auf der Website).
    url: data.url ?? `${site.replace(/\/$/, '')}/events/${eingabe.id}`,
    external: Boolean(data.url),
    ...(eingabe.location ? { location: alsOrt(eingabe.location) } : {}),
    ...(eingabe.organizer
      ? { organizer: { name: eingabe.organizer.name } }
      : {}),
    ...(eingabe.image ? { image: eingabe.image } : {}),
  }
}

/**
 * Baut den Feed: kommende Termine, aufsteigend sortiert.
 *
 * Was als `noindex` markiert ist, bleibt draußen — das Flag heißt „nicht
 * öffentlich auffindbar machen", und ein Feed ist genau das.
 *
 * Die Liste wird bei jedem Abruf frisch erzeugt (Serverbetrieb), kann aber
 * bis zu einer Stunde im Cache liegen. Wer sie länger aufhebt, filtert die
 * Vergangenheit noch einmal selbst heraus.
 */
export const erstelleFeed = (
  eingaben: FeedEingabe[],
  { site, jetzt }: Optionen,
): EventsFeed => ({
  version: 1,
  generatedAt: jetzt.toISOString(),
  events: eingaben
    .filter((eingabe) => !eingabe.data.noindex)
    .filter((eingabe) => !istVorbei(eingabe.data, jetzt))
    .sort((a, b) => a.data.startDate.getTime() - b.data.startDate.getTime())
    .map((eingabe) => alsTermin(eingabe, site)),
})
