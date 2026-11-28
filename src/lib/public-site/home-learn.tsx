'use client'

import { useEffect, useRef, useState } from 'react'
import { LEARN, DOOR_SOON } from './home-page-words'

/**
 * The home page's door to "AI from Zero in 3 Hours" (record 135), drawn
 * after the section animation supplied on 2026-11-28: a path fills, the
 * course's nine chapter tiles light one after another as it reaches them,
 * three to a level, then the two cards that say what finishing gives.
 *
 * It plays once, when the section first scrolls into view, and again on
 * Replay. It never loops. With less motion asked for, or with no script,
 * every tile simply stands lit. Nothing changes size while it plays, so the
 * page does not move. The course cannot be opened yet: the door says so and
 * links nowhere. Nothing here calls the network.
 */

const GELASIO = { fontFamily: 'var(--font-gelasio), Georgia, serif' } as const
const EACH = 0.62
const tileAt = (i: number) => `${(0.25 + i * EACH).toFixed(2)}s`

// Only while playing are things hidden first; the keyframes hold their end state.
const CSS = `
.hl-play .hl-fill{width:0;animation:hl-fill 7s cubic-bezier(.2,.7,.3,1) forwards}
.hl-play .hl-tile{opacity:.22;transform:translateY(8px);animation:hl-in .45s cubic-bezier(.2,.7,.3,1) forwards}
.hl-play .hl-lit{opacity:0;animation:hl-lit .45s cubic-bezier(.2,.7,.3,1) forwards}
.hl-play .hl-end{opacity:0;transform:translateY(8px);animation:hl-in .55s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes hl-fill{to{width:100%}}
@keyframes hl-in{to{opacity:1;transform:none}}
@keyframes hl-lit{to{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .hl-play .hl-fill{width:100%;animation:none}
  .hl-play .hl-tile,.hl-play .hl-end{opacity:1;transform:none;animation:none}
  .hl-play .hl-lit{opacity:1;animation:none}
}
`

export function HomeLearn() {
  // 0 is still (everything lit, as with no script); each play is a new number, so the keyframes start again.
  const [run, setRun] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!box.current || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setRun(1) } }, { threshold: 0.25 })
    io.observe(box.current)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={box} key={run} className={`rounded-[22px] border border-etyme-rule bg-etyme-raised px-[22px] py-7 sm:px-9 sm:py-9 ${run ? 'hl-play' : ''}`} data-slot="learn-section-animation">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-etyme-action-press">{LEARN.kicker}</p>
          <h2 className="mt-2 text-[30px] font-semibold leading-[1.12] sm:text-[42px]" style={GELASIO}>{LEARN.heading}</h2>
          <p className="mt-3 text-[16.5px] leading-[1.6] text-etyme-muted">{LEARN.lead}</p>
        </div>
        <span className="rounded-full border border-etyme-rule px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-etyme-muted">{DOOR_SOON}</span>
      </div>

      <div aria-hidden="true" className="mb-3.5 mt-6 h-1.5 overflow-hidden rounded-full bg-etyme-sunk">
        <div className="hl-fill h-full w-full rounded-full bg-gradient-to-r from-etyme-action to-etyme-attention" />
      </div>

      <ol className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 min-[900px]:grid-cols-3">
        {LEARN.tiles.map((t, i) => (
          <li key={t.h} className="hl-tile relative overflow-hidden rounded-xl border border-etyme-rule bg-etyme-raised p-3.5" style={{ animationDelay: tileAt(i) }}>
            {/* The lit state is its own layer, so lighting a tile changes no size and names no color by hand. */}
            <span aria-hidden="true" className="hl-lit absolute inset-0 rounded-xl border border-etyme-action-line bg-etyme-action-wash" style={{ animationDelay: tileAt(i) }} />
            <span className="relative block">
              <span className="block font-mono text-[12.5px] font-medium text-etyme-action-press">{String(i + 1).padStart(2, '0')} · {LEARN.levels[Math.floor(i / 3)]}</span>
              <span aria-hidden="true" className="mt-1.5 block text-[22px] leading-none">{t.ic}</span>
              <strong className="mt-1.5 block text-[19px] font-medium leading-tight" style={GELASIO}>{t.h}</strong>
              <span className="mt-1 block text-[13.5px] leading-[1.55] text-etyme-muted">{t.p}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="hl-end mt-4 grid gap-3 sm:grid-cols-2" style={{ animationDelay: `${(0.25 + LEARN.tiles.length * EACH + 0.3).toFixed(2)}s` }}>
        <div className="rounded-xl border border-etyme-verified-line bg-etyme-verified-wash px-4 py-3.5">
          <strong className="block text-[19px] font-medium text-etyme-verified" style={GELASIO}>{LEARN.doneH}</strong>
          <span className="mt-0.5 block text-[13.5px] leading-[1.55] text-etyme-muted">{LEARN.doneP}</span>
        </div>
        <div className="rounded-xl bg-etyme-action px-4 py-3.5 text-white">
          <strong className="block text-[19px] font-medium" style={GELASIO}>{LEARN.joinH}</strong>
          <span className="mt-0.5 block text-[13.5px] leading-[1.55] text-white/85">{LEARN.joinP}</span>
        </div>
      </div>

      <div className="mt-5">
        <button type="button" onClick={() => setRun((n) => n + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-etyme-rule bg-etyme-canvas px-4 py-2 text-[14.5px] font-semibold text-etyme-ink hover:border-etyme-action">
          <span aria-hidden="true">↻</span> {LEARN.replay}
        </button>
      </div>
    </div>
  )
}
