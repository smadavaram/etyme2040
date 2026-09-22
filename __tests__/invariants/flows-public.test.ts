import { describe, it, expect } from 'vitest'
import { FLOW_PAGES } from '@/lib/flows.generated'

/**
 * ── Why this exists ──────────────────────────────────────────────────
 *
 * The flow pages are generated from the same `docs/lanes/streams.mjs` the
 * party documents are drawn from, and those documents name another system
 * beside every one of Etyme's words on purpose — a buyer who knows that
 * system should read Etyme's screens without translating.
 *
 * None of it may reach etyme.com. `lib/positioning` already refuses a real
 * company on a marketing page at severity WRONG, and the hero had two
 * incumbents struck from it on 2026-09-20 because naming one "will trigger
 * more questions than answers".
 *
 * `docs/lanes/public.mjs` drops the trade-language tables and rewrites the
 * four captions that named a competitor. Nothing enforces that it keeps
 * doing so. This does: it re-runs the same regex over every string that
 * reaches a reader, so a caption edited later cannot quietly put a
 * competitor's name on the marketing site.
 */
const NAMED =
  /\b(sap|fieldglass|ariba|beeline|vndly|workday|coupa|servicenow|vendr|oracle|peoplesoft|magnit|prosperix|simplify vms)\b/i

function everyString(page: (typeof FLOW_PAGES)[number]): [string, string][] {
  const out: [string, string][] = [
    [`${page.slug}.title`, page.title],
    [`${page.slug}.eyebrow`, page.eyebrow],
    [`${page.slug}.lede`, page.lede],
  ]
  for (const d of page.diagrams) {
    out.push([`${page.slug}/${d.code}.name`, d.name])
    out.push([`${page.slug}/${d.code}.aria`, d.aria])
    out.push([`${page.slug}/${d.code}.caption`, d.caption])
    out.push([`${page.slug}/${d.code}.svg`, d.svg])
    for (const s of d.stations) {
      out.push([`${page.slug}/${d.code}.station ${s.n}.label`, s.label])
      if (s.note) out.push([`${page.slug}/${d.code}.station ${s.n}.note`, s.note])
      if (s.refuse) out.push([`${page.slug}/${d.code}.station ${s.n}.refuse`, s.refuse])
    }
  }
  return out
}

describe('the public flow pages', () => {
  it('names no other company anywhere a reader can see', () => {
    const found: string[] = []
    for (const page of FLOW_PAGES) {
      for (const [where, text] of everyString(page)) {
        const hit = text.match(NAMED)
        if (hit) found.push(`${where}: "${hit[0]}"`)
      }
    }
    expect(found).toEqual([])
  })

  it('carries no trade-language table, because that is what names them', () => {
    for (const page of FLOW_PAGES) {
      for (const d of page.diagrams) {
        expect(d).not.toHaveProperty('table')
      }
    }
  })

  it('gives every drawing a caption, an aria label and its stations', () => {
    expect(FLOW_PAGES.length).toBeGreaterThan(0)
    for (const page of FLOW_PAGES) {
      expect(page.diagrams.length).toBeGreaterThan(0)
      for (const d of page.diagrams) {
        expect(d.caption.length).toBeGreaterThan(40)
        expect(d.aria.length).toBeGreaterThan(40)
        expect(d.svg.startsWith('<svg')).toBe(true)
        expect(d.stations.length).toBeGreaterThan(3)
        for (const s of d.stations) expect(s.label.trim()).not.toBe('')
      }
    }
  })

  it('numbers the stations to match the drawing, from one, with no gaps', () => {
    for (const page of FLOW_PAGES) {
      for (const d of page.diagrams) {
        expect(d.stations.map((s) => s.n)).toEqual(d.stations.map((_, i) => i + 1))
      }
    }
  })

  it('gives every page a slug the route can serve', () => {
    const slugs = FLOW_PAGES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })
})
