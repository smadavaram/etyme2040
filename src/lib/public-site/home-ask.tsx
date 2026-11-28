'use client'

import { useEffect, useRef, useState } from 'react'
import { ASK, DOORS, DOOR_SOON } from './home-page-words'
import type { HomeSample } from './home-sample'

/**
 * The home page's Ask Etyme panel as a short chat, the three chat doors in a
 * narrow column beside it, and the CFO view behind one button (approved
 * design of 2026-11-18; the chat and the merged doors are the owner's change
 * of 2026-11-28). Four sample questions, each answered with the first rows
 * behind it; every figure is the seed's (`./home-sample`). The Ask panel is
 * told which question a role card points at through the `etyme:ask` event.
 * Nothing here calls the network.
 *
 * Motion: the question, the answer and its rows fade in, in order. The four
 * questions play once when the panel is first seen, then it rests; a tap
 * takes over. With less motion asked for, or with no script, the first
 * answer simply stands. The chat's height is fixed, so nothing moves the page.
 */

const GELASIO = { fontFamily: 'var(--font-gelasio), Georgia, serif' } as const
const DOOR_COLORS = ['bg-etyme-action', 'bg-etyme-verified', 'bg-etyme-ink']
/** How many rows of the record a chat answer shows. */
const ROWS_SHOWN = 3
const EACH_MS = 4600

const CSS = `
.ha-play .ha-step{opacity:0;animation:ha-in .25s ease-out forwards}
@keyframes ha-in{to{opacity:1}}
@media (prefers-reduced-motion: reduce){.ha-play .ha-step{opacity:1;animation:none}}
`

export function HomeAsk({ sample, startOn = 'pay' }: { sample: HomeSample; startOn?: string }) {
  const [key, setKey] = useState(startOn)
  const [cfo, setCfo] = useState(false)
  // 'still' until the panel is first seen; 'tour' while the four play once; 'yours' after a tap or the tour's end.
  const [mode, setMode] = useState<'still' | 'tour' | 'yours'>('still')
  const chat = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = (e: Event) => { setMode('yours'); setKey(String((e as CustomEvent).detail)) }
    window.addEventListener('etyme:ask', on)
    return () => window.removeEventListener('etyme:ask', on)
  }, [])

  useEffect(() => {
    if (mode !== 'still' || !chat.current || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setMode('tour') } }, { threshold: 0.4 })
    io.observe(chat.current)
    return () => io.disconnect()
  }, [mode])

  useEffect(() => {
    if (mode !== 'tour') return
    const i = sample.questions.findIndex((x) => x.key === key)
    const t = setTimeout(() => (i < sample.questions.length - 1 ? setKey(sample.questions[i + 1].key) : setMode('yours')), EACH_MS)
    return () => clearTimeout(t)
  }, [mode, key, sample.questions])

  const q = sample.questions.find((x) => x.key === key) ?? sample.questions[0]
  const rows = q.rows.slice(0, ROWS_SHOWN)
  const step = (n: number) => ({ animationDelay: `${n < 2 ? 150 + n * 650 : 1450 + (n - 2) * 220}ms` })
  const row = 'ha-step flex justify-between gap-2.5 border-t border-etyme-rule py-1.5 text-[14px] sm:grid sm:grid-cols-[1.4fr_1.2fr_auto]'

  return (
    <div className="mt-8 grid gap-[18px] min-[900px]:grid-cols-[4fr_1fr]">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-etyme-rule bg-etyme-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-etyme-rule px-5 py-4">
          <span className="text-[20px] font-semibold" style={GELASIO}>{ASK.title}</span>
          <span className="whitespace-nowrap rounded-full bg-etyme-ink px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.04em] text-etyme-canvas">{ASK.tag}</span>
        </div>
        <p className="px-5 pt-3 text-[13.5px] text-etyme-muted">{sample.context}</p>

        {/* The chat. Keyed by question, so each answer plays its own steps. */}
        <div ref={chat} id="answer" aria-live="polite" key={q.key} className={`flex h-[400px] flex-col gap-2.5 overflow-hidden px-5 py-4 sm:h-[330px] ${mode === 'still' ? '' : 'ha-play'}`}>
          <p className="ha-step max-w-[92%] self-end rounded-2xl rounded-br-[4px] bg-etyme-action px-3.5 py-2.5 text-[15px] text-white sm:max-w-[78%]" style={step(0)}>{q.question}</p>
          <div className="ha-step w-[94%] self-start rounded-2xl rounded-bl-[4px] border border-etyme-rule bg-etyme-raised px-3.5 py-2.5 sm:w-[78%]" style={step(1)}>
            <p className="mb-1.5 text-[18px] leading-snug sm:text-[19px]" style={GELASIO}>{q.lead} <span className="text-etyme-action-press">{q.rest}</span></p>
            <div role="table" aria-label="Record behind the answer">
              {rows.map((r, i) => (
                <div key={i} role="row" className={row} style={step(2 + i)}>
                  <span className="min-w-0">{r[0]}</span><span className="hidden min-w-0 text-etyme-muted sm:block">{r[1]}</span><span className="text-right font-semibold tabular-nums">{r[2]}</span>
                </div>
              ))}
              {q.total && (
                <div role="row" className={`${row} font-bold`} style={step(2 + rows.length)}>
                  <span>{q.total[0]}</span><span className="hidden sm:block">{q.total[1]}</span><span className="text-right tabular-nums">{q.total[2]}</span>
                </div>
              )}
            </div>
            {/* On a phone the rows carry the answer; the line under them needs the wider screen. */}
            <p className="mt-2 hidden text-[13px] leading-snug text-etyme-muted sm:block">{q.note}</p>
          </div>
        </div>

        <div role="group" aria-label="Sample questions" className="flex gap-2 overflow-x-auto border-t border-etyme-rule px-5 py-3.5 sm:flex-wrap">
          {sample.questions.map((x) => (
            <button
              key={x.key}
              type="button"
              data-q={x.key}
              aria-pressed={x.key === q.key}
              onClick={() => { setMode('yours'); setKey(x.key) }}
              className={`min-h-11 rounded-full border px-4 py-2 text-left text-[14.5px] font-semibold flex-none whitespace-nowrap sm:flex-initial sm:whitespace-normal ${x.key === q.key ? 'border-etyme-action bg-etyme-action text-white' : 'border-etyme-rule bg-etyme-canvas text-etyme-ink hover:border-etyme-action'}`}
            >
              {x.question}
            </button>
          ))}
        </div>

        <div className="border-t border-etyme-rule px-5 py-2">
          <button
            type="button"
            aria-expanded={cfo}
            aria-controls="cfoPanel"
            onClick={() => setCfo(!cfo)}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-etyme-action-press"
          >
            {ASK.cfoShow}
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: cfo ? 'rotate(180deg)' : undefined }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
        <div id="cfoPanel" hidden={!cfo} className="px-5 pb-5">
          <div className="grid gap-3 sm:grid-cols-2 min-[760px]:grid-cols-4">
            {sample.cfo.tiles.map((t) => (
              <div key={t.s} className="min-w-0 rounded-xl border border-etyme-rule bg-etyme-raised px-4 py-3.5">
                <strong className="block text-[22px] font-semibold" style={GELASIO}>{t.b}</strong>
                <span className="mt-0.5 block text-[13px] leading-snug text-etyme-muted">{t.s}</span>
              </div>
            ))}
          </div>
          <ul className="mt-3 grid gap-1 text-[14px] text-etyme-ink">
            {sample.cfo.lines.map((l) => (
              <li key={l.t}>{l.lead && <strong className="font-semibold">{l.lead} </strong>}{l.t}</li>
            ))}
          </ul>
          <p className="mt-3 text-[13.5px] text-etyme-muted">{ASK.cfoNote}</p>
        </div>
      </div>

      {/* The chat doors: where the same questions are asked. */}
      <aside aria-label={DOORS.heading} className="flex flex-row flex-wrap items-center gap-x-5 gap-y-3 rounded-[22px] border border-etyme-rule bg-etyme-raised px-4 py-[18px] min-[900px]:flex-col min-[900px]:flex-nowrap min-[900px]:items-stretch">
        <div className="basis-full min-[900px]:basis-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-etyme-action-press">{DOORS.kicker}</p>
          <h3 className="mt-1 text-[19px] font-semibold leading-tight" style={GELASIO}>{DOORS.heading}</h3>
        </div>
        {DOORS.items.map((d, i) => (
          <div key={d.h} className="flex items-center gap-2.5">
            <span aria-hidden="true" className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] text-[13px] font-bold text-white ${DOOR_COLORS[i]}`}>{d.mark}</span>
            <span className="min-w-0 text-[14.5px] font-bold leading-tight">
              {d.h}
              {d.soon && <span className="mt-1 block w-fit rounded-full border border-etyme-rule px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-etyme-muted">{DOOR_SOON}</span>}
            </span>
          </div>
        ))}
        <p className="basis-full text-[13px] leading-snug text-etyme-muted min-[900px]:mt-auto min-[900px]:basis-auto">
          <strong className="font-semibold text-etyme-ink">{DOORS.noteLead}</strong> {DOORS.note}
        </p>
      </aside>
    </div>
  )
}

/** A role card's link: opens the question that role cares about, then scrolls to the panel. */
export function RoleLink({ label, ask }: { label: string; ask: string }) {
  return (
    <a
      href="#ask"
      data-ask={ask}
      onClick={() => window.dispatchEvent(new CustomEvent('etyme:ask', { detail: ask }))}
      className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-etyme-action-press hover:underline"
    >
      {label} <span aria-hidden="true">→</span>
    </a>
  )
}
