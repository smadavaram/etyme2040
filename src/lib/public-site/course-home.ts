import type { SiteLook } from './site-look'

/**
 * The Course first layout (record 134; Pax's reference page of 2026-11-27):
 * a firm's free course leads its public page, and the bench and project
 * teams are reached from it.
 *
 * The layout is `app/site/[slug]/course-home`. Everything the firm says and
 * every color it is drawn in is the firm's own, stored on its record in
 * `Company.siteHome` and read only here. Nothing is defaulted: a missing
 * word or a malformed color returns null and the standing page is drawn.
 *
 * The Owner's yes covers the two saved brand colors. The palette is drawn
 * only while its ink is the approved primary color and its accent is the
 * approved secondary color, so a palette can never outrun the yes.
 *
 * Pure. Nothing in here touches the database.
 */

export const PALETTE_KEYS = ['ink', 'ink2', 'ink3', 'accent', 'accentDark', 'accentSoft', 'text', 'muted', 'paper', 'card', 'line', 'body'] as const
export type Palette = Record<(typeof PALETTE_KEYS)[number], string>

/** The four tracks a card can stand for, in the order the opening question lists them. */
export const HOME_TRACKS = ['kids', 'entry', 'non-it', 'it-upgrade'] as const
export type HomeTrack = (typeof HOME_TRACKS)[number]

type Step = { tag: string; title: string; line: string }

export interface CourseHomeWords {
  nav: { course: string; bench: string; teams: string; clients: string }
  hero: { kicker: string; headBefore: string; headMark: string; headAfter: string; lede: string; sub: string; start: string; join: string }
  course: { kicker: string; heading: string; lede: string; goodAt: string; go: string; cards: Record<HomeTrack, { icon: string; line: string }> }
  ramp: {
    kicker: string; heading: string; lede: string; note: string
    stages: [Step & { bubble: string }, Step & { bubble: string }, Step & { steps: string[] }]
  }
  doors: {
    kicker: string; heading: string; lede: string
    bench: { title: string; line: string; points: string[]; go: string }
    teams: { title: string; line: string; points: string[]; go: string }
  }
  bench: { kicker: string; heading: string; lede: string; steps: Step[]; action: string }
  teams: { kicker: string; heading: string; lede: string; steps: Step[] }
  client: { heading: string; line: string; action: string }
  footer: { line: string; motto: string }
}

export interface CourseHome {
  palette: Palette
  heroImage: { src: string; alt: string } | null
  words: CourseHomeWords
}

const HEX = /^#[0-9a-fA-F]{6}$/
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A word tree is sound when every leaf is a short, non-empty string and it has the same shape as the model. */
function sameShape(model: unknown, given: unknown): boolean {
  if (typeof model === 'string') return typeof given === 'string' && given.trim().length > 0 && given.length <= 400
  if (Array.isArray(model)) {
    if (!Array.isArray(given) || given.length === 0 || given.length > 8) return false
    return given.every((g, i) => sameShape(model[Math.min(i, model.length - 1)], g))
  }
  if (isObj(model)) return isObj(given) && Object.keys(model).every((k) => sameShape(model[k], given[k]))
  return false
}

const STEP = { tag: '', title: '', line: '' }
const SHAPE: unknown = {
  nav: { course: '', bench: '', teams: '', clients: '' },
  hero: { kicker: '', headBefore: '', headMark: '', headAfter: '', lede: '', sub: '', start: '', join: '' },
  course: {
    kicker: '', heading: '', lede: '', goodAt: '', go: '',
    cards: { kids: { icon: '', line: '' }, entry: { icon: '', line: '' }, 'non-it': { icon: '', line: '' }, 'it-upgrade': { icon: '', line: '' } },
  },
  ramp: { kicker: '', heading: '', lede: '', note: '', stages: [{ ...STEP, bubble: '' }, { ...STEP, bubble: '' }, { ...STEP, steps: [''] }] },
  doors: {
    kicker: '', heading: '', lede: '',
    bench: { title: '', line: '', points: [''], go: '' },
    teams: { title: '', line: '', points: [''], go: '' },
  },
  bench: { kicker: '', heading: '', lede: '', steps: [STEP], action: '' },
  teams: { kicker: '', heading: '', lede: '', steps: [STEP] },
  client: { heading: '', line: '', action: '' },
  footer: { line: '', motto: '' },
}

export function courseHomeOf(stored: unknown, look: Pick<SiteLook, 'template' | 'branded' | 'primary' | 'secondary'>): CourseHome | null {
  if (look.template !== 'COURSE_FIRST' || !look.branded || !isObj(stored)) return null
  const { palette, heroImage, words } = stored
  if (!isObj(palette) || !isObj(words)) return null

  const p = {} as Palette
  for (const k of PALETTE_KEYS) {
    const v = palette[k]
    if (typeof v !== 'string' || !HEX.test(v)) return null
    p[k] = v.toLowerCase()
  }
  // The palette stands on the two colors the Owner said yes to.
  if (p.ink !== look.primary?.toLowerCase() || p.accent !== look.secondary?.toLowerCase()) return null

  if (!sameShape(SHAPE, words)) return null
  const w = words as unknown as CourseHomeWords
  if (w.ramp.stages.length !== 3) return null

  let hero: CourseHome['heroImage'] = null
  if (isObj(heroImage) && typeof heroImage.src === 'string' && typeof heroImage.alt === 'string' && heroImage.alt.trim()) {
    const src = heroImage.src.trim()
    // The firm's own file or an https address; never a script or a data address.
    if (/^\/[a-z0-9/_.-]+$/i.test(src) || /^https:\/\/[^\s]+$/i.test(src)) hero = { src, alt: heroImage.alt.trim() }
  }
  return { palette: p, heroImage: hero, words: w }
}

/**
 * A count is printed on a public page only at 10 or more (Pax, 2026-11-27).
 * Below that the skill or badge is shown without its number, so a small
 * count can never point at one person.
 */
export const PUBLIC_COUNT_FLOOR = 10
export const publicCount = (n: number): number | null => (n >= PUBLIC_COUNT_FLOOR ? n : null)

/**
 * What a buyer's own assistant reads: the firm in schema.org words, built
 * only from what the page already shows. No person and no rate; nothing of
 * a tax ID, a bank account or a social security number is in what it is
 * given, so none can reach it. Counts follow the same floor as the page.
 */
export function homeLinkedData(site: {
  name: string; tagline: string; locations: string[]
  skills: { skill: string; count: number }[]
  track: { placements: number; activeNow: number; isNew: boolean }
}, url: string, learnUrl: string | null): Record<string, unknown> {
  const counted = [
    ['Placements recorded', site.track.isNew ? null : publicCount(site.track.placements)],
    ['Working now', site.track.isNew ? null : publicCount(site.track.activeNow)],
    ...site.skills.map((s) => [`Consultants with ${s.skill}`, publicCount(s.count)] as const),
  ].filter(([, n]) => n !== null)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url,
    description: site.tagline,
    ...(site.locations.length ? { areaServed: site.locations } : {}),
    ...(site.skills.length ? { knowsAbout: site.skills.map((s) => s.skill) } : {}),
    ...(counted.length ? { additionalProperty: counted.map(([name, value]) => ({ '@type': 'PropertyValue', name, value })) } : {}),
    ...(learnUrl ? { hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Free course', url: learnUrl } } : {}),
  }
}
