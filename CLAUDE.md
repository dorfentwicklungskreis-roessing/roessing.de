# Claude Konfiguration für roessing.de

## 🌐 Spracheinstellungen

**⚠️ WICHTIG: Claude MUSS ausschließlich auf Deutsch kommunizieren!**

### Sprachrichtlinien:
- **Alle** Antworten, Code-Kommentare und Erklärungen müssen auf Deutsch verfasst werden
- Deutsche Terminologie für technische Begriffe verwenden, wo sinnvoll
- Bei Code-Reviews und technischen Diskussionen deutsche Fachsprache nutzen
- Commit-Messages auch auf Deutsch
- GitHub Issues und Pull Requests auf Deutsch beantworten
- Fehlermeldungen und Statusberichte auf Deutsch formulieren
- Magic keywords von github auf English nutzen (fixes, closes, close, fix). Deutsche Übersetztungen funktionieren nicht.

## 📁 Projektübersicht

Dies ist die persönliche Website von Levin Keller (roessing.de), aufgebaut mit modernen Web-Technologien.

### Tech-Stack:
- **Framework**: Astro (Static Site Generator)
- **Page Builder**: Shipyard (entwickelt von Levin Keller) - basiert auf Astro
- **Sprachen**: TypeScript, JavaScript
- **Styling**: Tailwind CSS v4 (CSS-basierte Konfiguration in `src/styles/app.css`), DaisyUI v5
- **Testing**: Vitest (Unit-Tests), Playwright (E2E-Tests), Cypress
- **Paketmanager**: npm

## 🚢 Shipyard Framework

Diese Website wird mit **Shipyard** gebaut, einem Page-Builder-Framework von Levin Keller, das auf Astro basiert. Es ist von der API und dem Funktionsumfang her Docusaurus nachempfunden.

**Dokumentation**: https://shipyard.levinkeller.de

### Shipyard Pakete:
- **@levino/shipyard-base**: Basis-Komponenten, Layouts und Styling (Navigation, Footer, etc.)
- **@levino/shipyard-docs**: Dokumentations-Features
- **@levino/shipyard-blog**: Blog-Funktionalität mit Layouts und Collections

### ⚠️ KEINE eigenen Layouts, Navigation oder Footer!
**VERBOTEN: Eigene Layout-Dateien, NavBar-Komponenten oder Footer-Komponenten erstellen!**

Shipyard liefert alles was für Layouts benötigt wird:
- **`@levino/shipyard-base/layouts/Page.astro`** – Standard-Seiten-Layout (Navigation, Footer, Sidebar)
- **`@levino/shipyard-base/layouts/Splash.astro`** – Layout mit Prosa-Styling für MDX-Content

Für zusätzliche Head-Elemente (OG-Tags, JSON-LD, noindex etc.) bietet `Page.astro` einen `<slot name="head" />` sowie Props für `image`, `canonicalUrl` und `customMetaTags`. Beispiel:

```astro
<Page title="Titel" description="Beschreibung" image={ogImageUrl} customMetaTags={[...]}>
  <script slot="head" type="application/ld+json" set:html={jsonLd} />
  <MeinContent />
</Page>
```

Falls Shipyard ein benötigtes Feature nicht unterstützt: **Issue im Shipyard-Repo erstellen** statt Workarounds zu bauen. Levin Keller kontrolliert Shipyard und kann Patches implementieren lassen.

## 🚀 Deployment

**⚠️ WICHTIG: Diese Seite wird als Cloudflare WORKER deployed – NICHT als Cloudflare Pages!**

### Architektur:
- **Deployment-Typ**: Cloudflare Worker im Serverbetrieb (`@astrojs/cloudflare`) mit Static Assets
- **Konfiguration**: `wrangler.toml` (Worker-Name: `roessing-de`); `astro build` erzeugt daraus `dist/server/wrangler.json`, das `wrangler deploy` verwendet
- **Build-Output**: `dist/client/` (vorgerenderte Seiten und Assets) und `dist/server/` (Worker)
- **Hybrid**: Nur die Übersichten, die vom heutigen Datum abhängen – Startseite, `/events` und `/events.json` – setzen `export const prerender = false` und werden im Worker gerendert. Dort tauchen nur kommende Termine auf, ohne dass neu gebaut werden muss. Alles andere, auch die einzelnen Terminseiten `/events/[id]`, wird beim Build vorgerendert.
- **Edge-Caching**: Die Übersichten setzen `Astro.cache.set({ maxAge: cacheSekunden(jetzt) })` (Cloudflare-Cache-Provider in `astro.config.mjs`). Gecacht wird höchstens bis Mitternacht deutscher Zeit, damit vergangene Termine pünktlich herausfallen, und höchstens eine Stunde, damit neue Termine nach einem Deploy bald erscheinen. `astro preview` cacht nicht; die Header zeigt erst `npx wrangler dev -c dist/server/wrangler.json`.
- **Bilder**: werden beim Build mit sharp optimiert (`imageService: 'compile'`). Auf server-gerenderten Seiten werden sie unverändert über `/_image` ausgeliefert.
- **Neue datumsabhängige Seiten** ebenfalls mit `export const prerender = false` und Caching wie oben anlegen und für „vorbei/kommend" `istVorbei` aus `src/tools/events/feed.ts` verwenden (rechnet in deutscher Ortszeit; der Worker läuft in UTC).
- **Production-URL**: `https://xn--rssing-wxa.de/` (IDN für rössing.de)
- **Preview-URLs**: `https://{branch}-roessing-de.post-505.workers.dev`

### Build-Umgebungsvariablen (Cloudflare Workers Builds):
- `WORKERS_CI_BRANCH` – Aktueller Git-Branch (wird in `astro.config.mjs` für die Site-URL verwendet)
- `WORKERS_CI_COMMIT_SHA` – Commit-Hash
- `WORKERS_CI` – Ist `1` wenn im Worker-CI gebaut wird
- `CI` – Ist `true` im CI

### Infrastruktur:
- Git-Integration: Automatische Builds bei Push auf beliebigen Branch
- Preview-Deployments für alle Branches aktiviert

## 🛠️ Entwicklungsrichtlinien

### Code-Standards:
1. **TypeScript bevorzugen**: Neue Dateien sollten in TypeScript geschrieben werden
2. **Komponenten-Struktur**:
   - Astro-Komponenten in `src/components/`
   - Layouts: **Immer Shipyard-Layouts verwenden** (`@levino/shipyard-base/layouts/Page.astro` oder `Splash.astro`)
   - Seiten in `src/pages/`
3. **Styling**:
   - Tailwind CSS v4 für Utility-First Styling nutzen (Konfiguration in `src/styles/app.css`)
   - DaisyUI v5 Komponenten wo passend einsetzen
   - Keine Inline-Styles außer in Ausnahmefällen
   - Theme-Konfiguration erfolgt in `src/styles/app.css` via `@plugin "daisyui/theme"`

### Verfügbare Befehle:
```bash
npm run setup      # Abhängigkeiten installieren (NICHT npm install verwenden!)
npm run dev        # Entwicklungsserver starten (localhost:4321)
npm run build      # Produktions-Build erstellen
npm run preview    # Build lokal testen
npm run check      # Astro-Type-Checking
npm run test       # Vitest-Tests ausführen
npm run e2e        # Playwright-Tests ausführen
npm run format     # Code formatieren mit Biome (Linting + Formatting + Import-Sortierung)
```

### ⚠️ Vor jedem Commit
**WICHTIG:** Vor jedem Commit MUSS `npm run format` ausgeführt werden, um sicherzustellen, dass der Code korrekt formatiert ist. Dies wird auch automatisch durch lefthook beim Commit geprüft.

### Testing-Strategie:
- Unit-Tests mit Vitest für Komponenten-Logik
- E2E-Tests mit Playwright für kritische User-Flows
- Performance-Checks mit Unlighthouse

## 💬 Kommunikationsrichtlinien

### Antwortformat:
- Höflich und professionell auf Deutsch kommunizieren
- Kurze, präzise Antworten ohne überflüssige Erklärungen
- Bei komplexen Aufgaben strukturierte Schritt-für-Schritt-Anleitungen
- Code-Beispiele mit deutschen Kommentaren versehen

### Bei Code-Reviews:
- Konstruktives Feedback auf Deutsch
- Verbesserungsvorschläge mit Beispielen
- Sicherheitsaspekte und Best Practices hervorheben
- Performance-Optimierungen vorschlagen

### Fehlerbehandlung:
- Fehlermeldungen auf Deutsch übersetzen und erklären
- Lösungsvorschläge anbieten
- Auf relevante Dokumentation verweisen

## 📝 Git-Konventionen

### Commit-Messages:
- Können auf Englisch bleiben (Branchen-Standard)
- Format: `type(scope): description`
- Typen: feat, fix, docs, style, refactor, test, chore

### GitHub-Keywords:
**⚠️ WICHTIG: GitHub-Keywords MÜSSEN auf Englisch bleiben!**
- Keywords wie `fix`, `fixes`, `close`, `closes`, `resolve`, `resolves` für automatisches Issue-Schließen
- Diese Keywords funktionieren nur auf Englisch und sollten NICHT übersetzt werden
- Beispiel: `fix: Update navigation (#123)` - "fix" bleibt Englisch
- In PR-Beschreibungen: `Closes #123` - nicht "Schließt #123"

### Branch-Namen:
- Feature: `feature/beschreibung`
- Bugfix: `fix/beschreibung`
- Claude-generiert: `claude/issue-{nummer}-{datum}-{zeit}`

## 📅 Veranstaltungen (Events)

### Event-Schema:
Events werden als Markdown-Dateien in `src/content/events/` gespeichert. Dateiname-Konvention: `YYYY-MM-DD-beschreibung.md`.

#### Frontmatter-Felder:
- `name` (Pflicht): Name der Veranstaltung
- `description` (Pflicht): Kurzbeschreibung
- `startDate` (Pflicht): Startdatum/-zeit (z.B. `2026-03-14T09:30:00+01:00` oder `2026-03-14` für ganztägige Events)
- `endDate` (Optional): Enddatum/-zeit
- `allDay` (Optional, Standard: `false`): Wenn `true`, wird nur das Datum ohne Uhrzeit angezeigt. Für Events ohne bekannte Uhrzeit verwenden.
- `location` (Optional): Referenz zu einer Location in `src/data/locations/` (z.B. `dgh`, `kirche`)
- `organizer` (Optional): Referenz zu einem Organizer in `src/data/organizers/` (z.B. `spd`, `kulturkreis`)
- `url` (Optional): Externe kanonische Event-URL. **Zweck: SEO-Duplikate vermeiden.** Wenn der externe Veranstalter (Verein, Institution …) bereits eine vollwertige, schema.org-taugliche Event-Seite auf seiner eigenen Homepage betreibt, **muss** diese URL hier eingetragen werden, statt den Inhalt hier nochmal als zweiten kanonischen Link nachzubauen. Die Event-Kachel in Listen/Kalendern verlinkt dann direkt dorthin; die interne Detailseite (`/events/{id}`) wird weder verlinkt noch indexiert. **In diesem Fall darf kein Markdown-Body vorhanden sein** (wird per Test in `src/tools/events/content-rules.test.ts` erzwungen), sonst entstünde Inhalt, der für Besucher unerreichbar ist.
  - Faustregel: `url` setzen = „die externe Seite ist die Primärquelle, wir verlinken nur". Kein `url` setzen = „wir sind die Primärquelle, externer Link gehört (falls nötig) in den Markdown-Body".
  - Die meisten Vereinsseiten sind KEINE geeigneten Primärquellen (nur PDFs, reine Blog-Posts ohne Event-Schema, oder gar nichts im Netz). Dann lieber hier kanonisch abbilden und externe Links im Body ergänzen.
- `image` (Optional): Bild mit `src` und `alt`
- `noindex` (Optional): SEO-Flag

### Content (Markdown-Body):
**⚠️ WICHTIG: Jede Event-Datei MUSS Content nach dem Frontmatter enthalten – ES SEI DENN, `url` ist gesetzt (siehe oben).**
- Die `description` im Frontmatter ist nur eine Kurzbeschreibung für SEO/Vorschau und wird NICHT auf der Event-Seite angezeigt.
- Der eigentliche Seiteninhalt kommt aus dem Markdown-Body (nach dem schließenden `---`).
- Ohne Content ist die Event-Detailseite leer!
- Der Content sollte mindestens die `description` als Fließtext enthalten, idealerweise mit weiteren Details zur Veranstaltung.
- Bei externen Events (`url` gesetzt) muss der Body leer sein, damit kein Inhalt entsteht, der auf der Website nie erreichbar ist.

### Organizer und Locations:
- Organizer werden als YAML in `src/data/organizers/` definiert
- Locations werden als YAML in `src/data/locations/` definiert
- Neue Organizer/Locations als YAML-Datei anlegen und im Event per Dateiname (ohne `.yaml`) referenzieren
- Locations dürfen optional Koordinaten tragen (schema.org `GeoCoordinates`). Sie landen in `/events.json` und in den JSON-LD-Daten der Detailseite:
  ```yaml
  name: Dorfgemeinschaftshaus Rössing
  '@type': Place
  geo:
    '@type': GeoCoordinates
    latitude: 52.1843
    longitude: 9.8162
  ```

### `/events.json` – die Termine für andere Anwendungen:
Zusätzlich liefert der Worker `/events.json` aus (`src/pages/events.json.ts`). Die Dorf-App holt sich die Veranstaltungen von dort, damit sie **nicht ein zweites Mal gepflegt** werden müssen. Die Regeln des Formats stehen in `src/tools/events/feed.ts` und sind in `src/tools/events/feed.test.ts` (Vitest) sowie `tests/eventsJson.test.ts` (Playwright) festgehalten:
- Nur kommende Termine; vorbei ist ein Termin erst am Ende seines letzten Tages.
- `noindex`-Termine bleiben draußen – das Flag heißt „nicht öffentlich auffindbar machen".
- `allDay: true` → `start` ist nur ein Datum (`2026-03-14`), sonst Ortszeit mit Offset (`2026-03-14T09:30:00+01:00`).
- `url` gesetzt → `url` zeigt auf die externe Primärquelle und `external: true`; die interne Detailseite taucht dann nirgends auf (gleiche Regel wie auf der Website).
- Die Datei wird im Worker erzeugt und höchstens bis Mitternacht (maximal eine Stunde) gecacht: Wer sie länger aufhebt, filtert die Vergangenheit noch einmal selbst.

### ⛔ Vergangene Termine bleiben, wie sie waren

**Termine, die stattgefunden haben, werden inhaltlich nicht mehr angefasst.** Sie
sind eine Ankündigung, die es so gegeben hat – wer sie nachträglich umschreibt,
behauptet, es sei etwas anderes angekündigt worden, als die Leute damals gelesen
haben. Das ist Täuschung, auch wenn die neue Formulierung die schönere ist.

Das gilt für Titel, Beschreibung und Markdown-Body gleichermaßen und unabhängig
davon, wie gut der Grund klingt: bessere Formulierung, geänderte Haltung,
einheitlicher Sprachgebrauch, ein Wort, das man heute vermeidet.

Erlaubt bleiben:

- **Sachliche Korrekturen an Daten**, die den Termin auffindbar halten – ein
  falsch übernommenes Datum, ein kaputter Link, ein umbenannter Ort.
- **Technische Umstellungen**, die den Text unberührt lassen (Schema-Felder,
  Referenzen auf Organizer und Locations).
- **Löschen** eines Termins, den es nie gab.

Wer den Wortlaut von damals heute anders haben möchte, legt einen neuen Termin
an oder schreibt es in den kommenden – der vergangene bleibt stehen.

### Nach dem Anlegen eines neuen Events: Deep-Link nicht vergessen
Wenn ein neues Event hinterlegt wird, **immer** einen Deep-Link zur Detailseite (`/events/{id}`, `{id}` = Dateiname ohne `.md`) angeben – sowohl in der PR-Beschreibung/einem PR-Kommentar (Preview-URL, sobald das Cloudflare-Deployment durchgelaufen ist: `https://{branch}-roessing-de.post-505.workers.dev/events/{id}`) als auch in der Chat-Antwort an den Auftraggeber.

## 🖨️ Plakate und Aushänge

Plakate entstehen als Typst-Quellen (`.typ`) in `src/content/events/` (Termine)
und `print/` (dauerhafte Drucksachen). Die PDFs baut die Integration
`src/integrations/typst-posters.ts` bei jedem Build nach `public/posters/`; sie
werden bewusst nicht committet.

### Tonerschonend gestalten

**Der Hintergrund bleibt weiß. Farbe steckt in Schrift, Linien und Rahmen –
niemals in großen Flächen.** Ein Aushang wird nachgedruckt, kopiert und
weitergereicht; ein flächiger Farbblock leert die Kartusche und sieht auf dem
nächsten Kopierer grau und schmutzig aus.

Konkret heißt das:

- Kein `block(fill: …)` über die Breite, keine getönten Info-Kästen, keine
  farbige Kopf- oder Fußleiste.
- Statt Fläche: farbige Überschriften, kräftige Linien (`line(stroke: 2pt +
  accent)`) und Rahmen (`stroke:` statt `fill:`).
- Der QR-Code bleibt schwarz auf weiß – er muss scannbar sein.

### Vor dem Commit ansehen

Ein Plakat wird **angeschaut**, bevor es eingecheckt wird. Ob es auf eine Seite
passt, sieht man der Quelle nicht an: Schon ein Satz mehr schiebt die Fußzeile
auf Seite zwei, und im CI-Build fällt das nicht auf, weil zwei Seiten kein
Fehler sind.

In einer Umgebung ohne Netzzugang zu GitHub lässt sich Typst über PyPI holen
(`pip install typst`) und die Seite als Bild rendern:

```python
import typst
typst.compile('plakat.typ', output='vorschau{n}.png', format='png', ppi=100)
```

Entstehen mehrere PNG-Dateien, ist das Plakat zu lang. Dabei rendert die
Vorschau mit einer Ersatzschrift, weil Inter nachgeladen werden muss – das
Layout braucht deshalb etwas Puffer statt millimetergenauer Passung.

### QR-Codes

Nicht von Hand bauen: `npm run event-qr <event-dateiname>` erzeugt den Code aus
dem `shortlink` des Events (`scripts/generate-event-qr.js`), `npm run print-qr`
den für die Drucksachen in `print/`.

## ⚡ Wichtige Hinweise

1. **Immer auf Deutsch antworten** - keine Ausnahmen!
2. Bei Unsicherheiten nachfragen statt anzunehmen
3. Sicherheit hat oberste Priorität
4. Code-Qualität vor Geschwindigkeit
5. Tests schreiben/aktualisieren bei Code-Änderungen
6. Dokumentation aktuell halten

## 🔒 Sicherheitsrichtlinien

- Niemals Secrets oder API-Keys committen
- Keine sensiblen Daten in Logs ausgeben
- Input-Validierung bei allen Benutzereingaben
- Abhängigkeiten regelmäßig aktualisieren
- CORS-Einstellungen sorgfältig prüfen

### npm-Sicherheit mit allow-scripts
Dieses Projekt verwendet `@lavamoat/allow-scripts` zum Schutz vor bösartigen npm-Lifecycle-Skripten:
- **Immer `npm run setup` statt `npm install` verwenden!**
- Die `.npmrc` blockiert alle Lifecycle-Skripte standardmäßig
- Nur explizit erlaubte Pakete in `package.json` unter `lavamoat.allowScripts` können Skripte ausführen
