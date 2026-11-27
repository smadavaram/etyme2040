import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * The Course first storefront (record 134): a firm's free course leads its
 * public page, drawn in the firm's own look from its own record.
 */

vi.mock('next/font/google', () => ({ Sora: () => ({ variable: 'sora' }), Manrope: () => ({ variable: 'manrope' }) }))
vi.mock('@/app/site/[slug]/join-bench', () => ({ JoinBench: () => 'JOIN-FORM' }))
vi.mock('@/app/site/ask', () => ({ Ask: () => 'ASK-FORM' }))
vi.mock('@/app/site/[slug]/course-home.css', () => ({}))

import { courseHomeOf, publicCount, homeLinkedData, PALETTE_KEYS } from '@/lib/public-site/course-home'
import { lookFor, orderFor } from '@/lib/public-site/site-look'
import { brandingFingerprint, contrastRatio, SITE_TEMPLATE_NAMES, FONT_PAIRINGS } from '@/lib/site-settings'
import { CourseHomePage } from '@/app/site/[slug]/course-home'
import { TAPIN_BRANDING, TAPIN_HOME } from '../../scripts/tapin-home.data'

const branding = { logoRef: null, primaryColor: TAPIN_BRANDING.primaryColor, secondaryColor: TAPIN_BRANDING.secondaryColor, fontPairing: TAPIN_BRANDING.fontPairing }
const stored = (over: Record<string, unknown> = {}) => ({
  siteTemplate: 'COURSE_FIRST', siteLogoRef: null, sitePrimaryColor: branding.primaryColor, siteSecondaryColor: branding.secondaryColor,
  siteFontPairing: branding.fontPairing, sitePages: null,
  siteBrandingApprovedAt: new Date('2026-11-27T00:00:00Z'), siteBrandingApprovedHash: brandingFingerprint(branding), ...over,
})
const clone = () => JSON.parse(JSON.stringify(TAPIN_HOME))

function site(over: Record<string, unknown> = {}): any {
  const look = lookFor(stored())
  return {
    name: 'Tapin', slug: 'tapin', does: '', kind: 'VENDOR', audience: 'TALENT_AND_BUYERS', locations: [], tagline: 'Data engineering consultants.', intro: '',
    track: { placements: 4, activeNow: 2, clients: 1, isNew: false },
    skills: [{ skill: 'Spark', count: 12 }, { skill: 'Airflow', count: 3 }],
    comingFree: [], comingFreeSummary: null, joinBench: true, askBox: true, contact: null, liveSince: '2026-10-29',
    learnOpen: true, look, home: courseHomeOf(TAPIN_HOME, look), courses: [], ...over,
  }
}
const html = (over: Record<string, unknown> = {}) => { const s = site(over); return renderToStaticMarkup(CourseHomePage({ site: s, home: s.home })) }

describe('the Course first layout is one more choice on the one engine', () => {
  it('an Owner reads it as "Course first", beside Ask first, Feed and Board', () => {
    expect(SITE_TEMPLATE_NAMES.COURSE_FIRST).toBe('Course first')
  })
  it('Sora headlines with Manrope body is a font pairing any firm may pick', () => {
    expect(FONT_PAIRINGS.SORA_MANROPE).toBe('Sora headlines, Manrope body')
    expect(lookFor(stored()).headFont).toContain('Sora')
    expect(lookFor(stored()).bodyFont).toContain('Manrope')
  })
  it('where the course page cannot be drawn, a Course first firm’s sections read in the Ask first order', () => {
    expect(orderFor('COURSE_FIRST', ['joinBench', 'ask', 'skills'])).toEqual(orderFor('ASK_FIRST', ['joinBench', 'ask', 'skills']))
  })
})

describe('a firm’s course home is read from its own record', () => {
  it('a firm with the layout, the content and its Owner’s yes gets its course home', () => {
    expect(courseHomeOf(TAPIN_HOME, lookFor(stored()))).not.toBeNull()
  })
  it('a firm whose Owner has not approved the branding keeps the standing page', () => {
    expect(courseHomeOf(TAPIN_HOME, lookFor(stored({ siteBrandingApprovedAt: null })))).toBeNull()
  })
  it('a brand color changed after the Owner’s yes sends the page back to its standing form', () => {
    expect(courseHomeOf(TAPIN_HOME, lookFor(stored({ sitePrimaryColor: '#111111' })))).toBeNull()
  })
  it('a firm on another layout never gets a course home, whatever is stored', () => {
    expect(courseHomeOf(TAPIN_HOME, lookFor(stored({ siteTemplate: 'FEED' })))).toBeNull()
  })
  it('a palette that does not stand on the two approved brand colors is not drawn', () => {
    const h = clone(); h.palette.accent = '#ff0000'
    expect(courseHomeOf(h, lookFor(stored()))).toBeNull()
  })
  it('a palette with a missing or malformed color is never half-drawn', () => {
    const a = clone(); a.palette.line = 'grey'
    const b = clone(); delete b.palette.muted
    expect(courseHomeOf(a, lookFor(stored()))).toBeNull()
    expect(courseHomeOf(b, lookFor(stored()))).toBeNull()
  })
  it('a home with a heading or a track card missing keeps the standing page', () => {
    const a = clone(); a.words.bench.heading = ' '
    const b = clone(); delete b.words.course.cards.kids
    expect(courseHomeOf(a, lookFor(stored()))).toBeNull()
    expect(courseHomeOf(b, lookFor(stored()))).toBeNull()
  })
  it('a hero picture is taken only from the firm’s own file or an https address', () => {
    const at = (src: string) => { const h = clone(); h.heroImage.src = src; return courseHomeOf(h, lookFor(stored()))!.heroImage }
    expect(at('/tenants/tapin/hero.webp')).not.toBeNull()
    expect(at('https://example.invalid/hero.jpg')).not.toBeNull()
    expect(at('javascript:alert(1)')).toBeNull()
    expect(at('data:image/png;base64,AAAA')).toBeNull()
  })
})

describe('Tapin’s home is Tapin’s look and the words of the reference page', () => {
  const home = courseHomeOf(TAPIN_HOME, lookFor(stored()))!
  it('Tapin’s eight brand colors are the tokens of the source pack', () => {
    const { ink, ink2, ink3, accent, accentDark, accentSoft, text, muted } = home.palette
    expect({ ink, ink2, ink3, accent, accentDark, accentSoft, text, muted }).toEqual({
      ink: '#0a1c2c', ink2: '#0f2a40', ink3: '#14334d', accent: '#0db5a3',
      accentDark: '#078f81', accentSoft: '#e0f5f1', text: '#eaf2f7', muted: '#a9bfce',
    })
    expect(Object.keys(home.palette).sort()).toEqual([...PALETTE_KEYS].sort())
  })
  it('Tapin’s text, muted text and teal can all be read on its ink background', () => {
    for (const c of [home.palette.text, home.palette.muted, home.palette.accent]) expect(contrastRatio(c, home.palette.ink)).toBeGreaterThanOrEqual(4.5)
  })
  it('a teal button is lettered in ink, because white on Tapin’s teal cannot be read', () => {
    expect(contrastRatio('#ffffff', home.palette.accent)).toBeLessThan(4.5)
    expect(contrastRatio(home.palette.ink, home.palette.accent)).toBeGreaterThanOrEqual(4.5)
  })
  it('Tapin’s hero picture is the file Pax supplied, and it is in the repository', () => {
    expect(home.heroImage!.src).toBe('/tenants/tapin/hero.webp')
    expect(readFileSync('public/tenants/tapin/hero.webp').length).toBeGreaterThan(50_000)
  })
  it('the script that writes Tapin’s home never gives the Owner’s yes and never switches a plugin', () => {
    const src = readFileSync('scripts/tapin-home.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/siteBrandingApprovedAt: new|pluginsOn|pluginSwitch/)
  })
})

describe('the course home page', () => {
  it('the sections are said in the order of the reference page', () => {
    const page = html()
    const at = [
      'Get on the record.', 'First — one question: What are you?', 'Three steps. That is the whole climb.',
      'Learning turns into work — two doors', 'Why the bench is ready when the role opens',
      'Interview-ready consultants — or the whole outcome', 'Have a data engineering role open?', 'ASK-FORM',
    ].map((s) => page.indexOf(s))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
  it('each of the four cards opens its own track on the firm’s course site', () => {
    const page = html()
    for (const t of ['kids', 'entry', 'non-it', 'it-upgrade']) expect(page).toContain(`href="/learn/tapin/${t}?from=door"`)
  })
  it('a track that is not built yet says "Not live yet" on its card, and the built one says start', () => {
    const page = html()
    expect(page.match(/Not live yet/g)?.length).toBe(3)
    expect(page.match(/Start this path →/g)?.length).toBe(1)
  })
  it('the hero’s one filled button starts the course', () => {
    expect(html()).toMatch(/<a class="ch-btn" href="\/learn\/tapin\?from=door">Start learning/)
  })
  it('the agent’s five steps are shown in order: ask, check, decide, act, record', () => {
    const page = html()
    const at = ['1 · Ask', '2 · Check', '3 · Decide', '4 · Act', '5 · Record'].map((s) => page.indexOf(s))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
  it('the bench section holds the join-the-bench form', () => {
    expect(html()).toContain('JOIN-FORM')
  })
  it('a skill held by ten or more people shows its count, and a smaller count shows the skill alone', () => {
    const page = html()
    expect(page).toContain('Spark<b>12</b>')
    expect(page).toContain('>Airflow</span>')
    expect(publicCount(9)).toBeNull()
    expect(publicCount(10)).toBe(10)
  })
  it('the page lists no course by name', () => {
    expect(html({ courses: [{ title: 'Spark for data engineers', hours: 12 }] })).not.toContain('Spark for data engineers')
  })
  it('the hero has a picture slot, filled only by the firm’s own picture', () => {
    expect(html()).toContain('data-slot="hero-image"')
    expect(html()).toContain('src="/tenants/tapin/hero.webp"')
    const none = clone(); delete none.heroImage
    const s = site(); s.home = courseHomeOf(none, s.look)
    expect(renderToStaticMarkup(CourseHomePage({ site: s, home: s.home }))).not.toContain('<img')
  })
  it('no Etyme purple and no Etyme cream is written on the page or in its stylesheet', () => {
    const css = readFileSync('src/app/site/[slug]/course-home.css', 'utf8').toUpperCase()
    const page = html().toUpperCase()
    for (const hex of ['5228FF', '4421D6', '3F16E8', 'EDE9FF', 'F0EEE6']) { expect(css).not.toContain(hex); expect(page).not.toContain(hex) }
  })
  it('all motion is off when the reader asked for less motion', () => {
    const css = readFileSync('src/app/site/[slug]/course-home.css', 'utf8')
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{\.ch \*\{animation:none!important;transition:none!important\}/)
  })
  it('nothing on the page moves the layout: no transform and no size is animated', () => {
    const css = readFileSync('src/app/site/[slug]/course-home.css', 'utf8')
    const moving = [...css.matchAll(/transition:([^;}]+)/g)].map((m) => m[1])
    for (const t of moving) expect(t).toMatch(/^(none!important|(background-color|border-color) \.18s ease-out)$/)
    expect(css.split('\n').find((l) => l.startsWith('@keyframes'))!).not.toMatch(/transform|width|height|margin|padding/)
  })
})

describe('what a buyer’s assistant reads from the home', () => {
  const data = homeLinkedData(site(), 'https://example.invalid/site/tapin', 'https://example.invalid/learn/tapin')
  const text = JSON.stringify(data)
  it('it reads the firm, its skills and the door into the course', () => {
    expect(text).toContain('Tapin'); expect(text).toContain('Spark'); expect(text).toContain('/learn/tapin')
  })
  it('it reads a count only at ten or more', () => {
    expect(text).toContain('"Consultants with Spark","value":12')
    expect(text).not.toContain('Consultants with Airflow')
    expect(text).not.toContain('Placements recorded')
  })
  it('it reads nothing about a person, a rate, a tax ID or a bank', () => {
    expect(text).not.toMatch(/tax|bank|ssn|social security|\brate\b|email|phone/i)
  })
})
