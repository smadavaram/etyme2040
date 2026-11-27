import type { CSSProperties } from 'react'
import type { PublicSite } from '@/lib/public-site'
import { homeLinkedData, publicCount, HOME_TRACKS, type CourseHome } from '@/lib/public-site/course-home'
import { SITE_FONT_VARS } from '@/lib/public-site/site-fonts'
import { OPENING_CARDS, NOT_LIVE_YET, routeFor } from '@/lib/training/courses/opening'
import { VERSION } from '@/lib/training/courses/index'
import { JOIN_BENCH_COPY } from '@/lib/public-site/join-bench'
import { FIRM_ASK_COPY } from '@/lib/public-site/firm-page'
import { mailLeaves } from '@/lib/notify/mail-leaves'
import { appUrl } from '@/lib/app-url'
import { JoinBench } from './join-bench'
import { Ask } from '../ask'
import './course-home.css'

/**
 * The Course first layout (record 134): the firm's free course leads its
 * public page, and the bench and project teams are reached from it. Sections
 * and their order follow Pax's reference page of 2026-11-27.
 *
 * The layout is this file and its stylesheet. Every word is the firm's own
 * (`site.home.words`), every color one of its twelve, and the picture its
 * own file; with no picture the hero is drawn without one. The four cards
 * are the course's own opening question: each routes into the course site,
 * and a track that is not built yet says so.
 *
 * The two forms are the standing ones: a consultant asks to join and the
 * yes is given from the letter; a client's question lands in the firm's own
 * Ask Etyme. A count is printed only at ten or more (`publicCount`).
 */
export function CourseHomePage({ site, home }: { site: PublicSite; home: CourseHome }) {
  const p = home.palette
  const w = home.words
  const vars = {
    '--ch-ink': p.ink, '--ch-ink-2': p.ink2, '--ch-ink-3': p.ink3,
    '--ch-accent': p.accent, '--ch-accent-dark': p.accentDark, '--ch-accent-soft': p.accentSoft,
    '--ch-text': p.text, '--ch-muted': p.muted,
    '--ch-paper': p.paper, '--ch-card': p.card, '--ch-line': p.line, '--ch-body': p.body,
    '--ch-head-font': site.look.headFont ?? 'system-ui, sans-serif',
    '--ch-body-font': site.look.bodyFont ?? 'system-ui, sans-serif',
  } as CSSProperties
  const learn = `/learn/${site.slug}`
  const linked = homeLinkedData(site, `${appUrl()}/site/${site.slug}`, `${appUrl()}${learn}`)
  const cards = HOME_TRACKS.map((t) => ({ ...OPENING_CARDS.find((c) => c.track === t)!, ...w.course.cards[t] }))
  const [s1, s2, s3] = w.ramp.stages

  return (
    <div className={`ch ${SITE_FONT_VARS}`} style={vars}>
      {/* For a buyer's own assistant: the same facts the page shows, and no others. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(linked).replace(/</g, '\\u003c') }} />
      <link rel="alternate" type="application/json" href={`/api/site/${site.slug}`} />

      <nav className="ch-nav">
        <div className="ch-wrap ch-nav-in">
          <div className="ch-logo">{site.name}</div>
          <div className="ch-nav-links">
            <a href="#ai" className="on">{w.nav.course}</a>
            {site.joinBench && <a href="#bench">{w.nav.bench}</a>}
            <a href="#teams">{w.nav.teams}</a>
            {site.askBox && <a href="#clients">{w.nav.clients}</a>}
          </div>
        </div>
      </nav>

      <header className="ch-hero">
        {/* The hero picture is the firm's own. With none, the slot stays empty. */}
        <div data-slot="hero-image">
          {home.heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bg" src={home.heroImage.src} alt={home.heroImage.alt} />
          )}
        </div>
        <div className="shade" />
        <div className="ch-wrap">
          <div className="ch-hero-in">
            <div className="ch-kicker">{w.hero.kicker}</div>
            <h1>{w.hero.headBefore} <em>{w.hero.headMark}</em> {w.hero.headAfter}</h1>
            <p className="ch-lede">{w.hero.lede}</p>
            <p className="ch-sub">{w.hero.sub}</p>
            <div className="ch-cta">
              <a className="ch-btn" href={`${learn}?from=door`}>{w.hero.start}</a>
              {site.joinBench && <a className="ch-btn ghost" href="#bench">{w.hero.join}</a>}
            </div>
            <div className="ch-version">{VERSION}</div>
          </div>
        </div>
      </header>

      {/* The course's own opening question. Each card routes into the course site. */}
      <section className="light" id="ai">
        <div className="ch-wrap">
          <div className="ch-sec-kicker">{w.course.kicker}</div>
          <h2>{w.course.heading}</h2>
          <p className="ch-sec-lede">{w.course.lede}</p>
          <div className="ch-q-grid">
            {cards.map((c) => (
              <a key={c.track} className="ch-q-card" href={`${routeFor(site.slug, c.track)}?from=door`}>
                <div className="ic" aria-hidden="true">{c.icon}</div>
                <h3>{c.label}</h3>
                <p>{c.line}</p>
                {c.live ? <div className="go">{w.course.go}</div> : <div className="soon">{NOT_LIVE_YET}</div>}
              </a>
            ))}
          </div>
          <div className="ch-goodat">{w.course.goodAt}</div>
        </div>
      </section>

      {/* Pax's on-ramp: three stages lit in order. Slot: data-slot="onramp-animation". */}
      <section className="dark" id="onramp">
        <div className="ch-wrap">
          <div className="ch-sec-kicker">{w.ramp.kicker}</div>
          <h2>{w.ramp.heading}</h2>
          <p className="ch-sec-lede">{w.ramp.lede}</p>
          <div className="ch-ramp" data-slot="onramp-animation">
            <div className="ch-stage s1">
              <div className="tag">{s1.tag}</div><h3>{s1.title}</h3><p>{s1.line}</p>
              <div className="bubble">{s1.bubble}</div>
            </div>
            <div className="ch-arrow" aria-hidden="true">→</div>
            <div className="ch-stage s2">
              <div className="tag">{s2.tag}</div><h3>{s2.title}</h3><p>{s2.line}</p>
              <div className="bubble">{s2.bubble}</div>
            </div>
            <div className="ch-arrow" aria-hidden="true">→</div>
            <div className="ch-stage s3">
              <div className="tag">{s3.tag}</div><h3>{s3.title}</h3><p>{s3.line}</p>
              <div className="steps">{s3.steps.map((s) => <span key={s}>{s}</span>)}</div>
            </div>
          </div>
          <p className="ch-ramp-note">{w.ramp.note}</p>
        </div>
      </section>

      <section className="light" id="doors">
        <div className="ch-wrap">
          <div className="ch-sec-kicker">{w.doors.kicker}</div>
          <h2>{w.doors.heading}</h2>
          <p className="ch-sec-lede">{w.doors.lede}</p>
          <div className="ch-doors">
            {site.joinBench && (
              <a className="ch-door bench" href="#bench">
                <h3>{w.doors.bench.title}</h3>
                <p>{w.doors.bench.line}</p>
                <ul>{w.doors.bench.points.map((x) => <li key={x}>{x}</li>)}</ul>
                <span className="go">{w.doors.bench.go}</span>
              </a>
            )}
            <a className="ch-door teams" href="#teams">
              <h3>{w.doors.teams.title}</h3>
              <p>{w.doors.teams.line}</p>
              <ul>{w.doors.teams.points.map((x) => <li key={x}>{x}</li>)}</ul>
              <span className="go">{w.doors.teams.go}</span>
            </a>
          </div>
        </div>
      </section>

      {/* The bench. Skills from the record; her yes is given from the letter, never here. */}
      {site.joinBench && (
        <section className="dark" id="bench">
          <div className="ch-wrap">
            <div className="ch-sec-kicker">{w.bench.kicker}</div>
            <h2>{w.bench.heading}</h2>
            <p className="ch-sec-lede">{w.bench.lede}</p>
            <div className="ch-steps3">
              {w.bench.steps.map((s) => (
                <div className="ch-step" key={s.tag}><div className="n">{s.tag}</div><h3>{s.title}</h3><p>{s.line}</p></div>
              ))}
            </div>
            {site.skills.length > 0 && (
              <div className="ch-chips">
                {site.skills.map((s) => (
                  <span className="ch-chip" key={s.skill}>{s.skill}{publicCount(s.count) !== null && <b>{s.count}</b>}</span>
                ))}
              </div>
            )}
            <div style={{ marginTop: 28 }}><a className="ch-btn" href={`${learn}?from=door`}>{w.bench.action}</a></div>
            <div className="ch-form">
              <h3 style={{ fontSize: 20, color: '#fff' }}>{JOIN_BENCH_COPY.heading}</h3>
              <p className="ch-sec-lede" style={{ marginTop: 8, fontSize: 15 }}>{JOIN_BENCH_COPY.means}</p>
              <JoinBench slug={site.slug} letterCanLeave={mailLeaves()} />
            </div>
          </div>
        </section>
      )}

      <section className="light" id="teams">
        <div className="ch-wrap">
          <div className="ch-sec-kicker">{w.teams.kicker}</div>
          <h2>{w.teams.heading}</h2>
          <p className="ch-sec-lede">{w.teams.lede}</p>
          <div className="ch-steps3">
            {w.teams.steps.map((s) => (
              <div className="ch-step" key={s.tag}><div className="n">{s.tag}</div><h3>{s.title}</h3><p>{s.line}</p></div>
            ))}
          </div>
        </div>
      </section>

      {site.askBox && (
        <>
          <div className="ch-band" id="clients">
            <div className="ch-wrap">
              <h2>{w.client.heading}</h2>
              <p>{w.client.line}</p>
              <a className="ch-btn" href="#ask">{w.client.action}</a>
            </div>
          </div>
          {/* A question that lands in the firm's own Ask Etyme. */}
          <section className="light" id="ask">
            <div className="ch-wrap">
              <p className="ch-sec-lede" style={{ marginBottom: 24 }}>{FIRM_ASK_COPY.means(site.name)}</p>
              <Ask source="GENERATED_SITE" firm={{ slug: site.slug, name: site.name }} />
            </div>
          </section>
        </>
      )}

      <footer className="ch-footer">
        <div className="ch-wrap ch-foot-in">
          <div className="ch-logo" style={{ fontSize: 18 }}>{site.name}</div>
          <div>{w.footer.line}</div>
          <div className="r">{VERSION} · {w.footer.motto}</div>
        </div>
        <div className="ch-wrap" style={{ marginTop: 14, fontSize: 12 }}>
          Everything counted on this page comes from work recorded on Etyme. It is not a recommendation from Etyme.{' '}
          <a href="https://etyme.com">Runs on Etyme</a>
        </div>
      </footer>
    </div>
  )
}
