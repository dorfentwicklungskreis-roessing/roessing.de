import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

const SHORTLINK_REGEX = /^shortlink:\s*([a-z0-9]{3})\s*$/m

const eventShortlinks = (): AstroIntegration => ({
  name: 'event-shortlinks',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const eventsDir = join(process.cwd(), 'src/content/events')
      const files = readdirSync(eventsDir).filter(
        (f) => !f.startsWith('_') && (f.endsWith('.md') || f.endsWith('.mdx')),
      )

      const seen = new Map<string, string>()
      const lines: string[] = []

      for (const file of files) {
        const raw = readFileSync(join(eventsDir, file), 'utf-8')
        const match = raw.match(SHORTLINK_REGEX)
        if (!match) continue
        const code = match[1] as string
        const previous = seen.get(code)
        if (previous) {
          throw new Error(
            `Doppelter shortlink "${code}" in "${file}" und "${previous}". Shortlinks müssen eindeutig sein.`,
          )
        }
        seen.set(code, file)
        const slug = file.replace(/\.(md|mdx)$/, '')
        lines.push(`/${code}\t/events/${slug}\t301`)
      }

      if (lines.length === 0) {
        logger.info(
          'Keine Event-Shortlinks gefunden, _redirects nicht geschrieben.',
        )
        return
      }

      // Anhängen statt überschreiben: Der Cloudflare-Adapter schreibt die
      // Weiterleitungen aus `redirects` (z.B. /imprint) in dieselbe Datei.
      const outPath = join(fileURLToPath(dir), '_redirects')
      const vorhanden = existsSync(outPath)
        ? readFileSync(outPath, 'utf-8')
        : ''
      const trenner = vorhanden && !vorhanden.endsWith('\n') ? '\n' : ''
      appendFileSync(outPath, `${trenner}${lines.join('\n')}\n`, 'utf-8')
      logger.info(
        `${lines.length} Event-Shortlink(s) nach _redirects geschrieben.`,
      )
    },
  },
})

export default eventShortlinks
