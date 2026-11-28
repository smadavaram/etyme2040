'use client'

import { useCallback, useEffect, useState } from 'react'
import { readJson } from '@/lib/read-response'
import { Field, FormMessage, Input, Panel, Select, SubmitButton } from '@/components/ui'

/**
 * Learning mode (matrix L3.2.2.31, L3.2.2.39, L3.2.2.40), on Companies,
 * Outreach. The outcomes read from the firm's own record, the outcome series
 * built from them as one pack, and the week's post drafts. One line says that
 * nothing sends yet, and why.
 */

interface Figure { label: string; value: number; unit: string; failure?: boolean }
interface Outcome { id: string; title: string; figures: Figure[]; failureIncluded: boolean; state: string; week: string }
interface Letter { position: number; subject: string; body: string; offsetDays: number; proofChecked: boolean }
interface Series { id: string; name: string; state: string; letters: Letter[] }
interface Draft { id: string; title: string; body: string | null; state: string; reasons: string[]; brand: string | null }
interface Segment { id: string; name: string }

const STATE: Record<string, string> = { PROPOSED: 'Waiting for a yes', APPROVED: 'Approved, held', CLOSED: 'Closed', READY: 'Ready', BLOCKED: 'Blocked', MINED: 'Not in a series', DRAFTED: 'In a series' }

export function LearningPanel() {
  const [gate, setGate] = useState<string | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [form, setForm] = useState({ name: '', segmentId: '', outcomeIds: [] as string[] })
  const [error, setError] = useState<{ field?: string; says: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, p, g] = await Promise.all([readJson(await fetch('/api/outreach/series')), readJson(await fetch('/api/outreach/publish')), readJson(await fetch('/api/outreach/segments'))])
      setGate(s.data.gate.says); setOutcomes(s.data.outcomes); setSeries(s.data.series); setDrafts(p.data.drafts); setSegments(g.data.segments)
    } catch (err: any) { setError({ says: err.message }) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function post(url: string, body: unknown, key: string, done: (d: any) => string) {
    setBusy(key); setError(null); setNote(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const out = await res.json().catch(() => null)
      if (!res.ok) { setError({ field: out?.error?.field, says: out?.error?.message ?? 'That did not go through.' }); return }
      setNote(done(out.data)); await load()
    } catch (err: any) { setError({ says: err.message }) } finally { setBusy(null) }
  }
  const mine = (f: string) => (error?.field === f ? error.says : undefined)
  const pick = (id: string) => setForm((f) => ({ ...f, outcomeIds: f.outcomeIds.includes(id) ? f.outcomeIds.filter((x) => x !== id) : [...f.outcomeIds, id] }))

  return (
    <section className="mt-8">
      <h2 className="headline-serif text-[22px]">Outcome series and posts</h2>
      {gate && <p className="mt-1 text-[13px] text-etyme-ink">{gate} Packs, series and posts are drafted and can be approved; none of them leaves.</p>}
      {error && !error.field && <div className="mt-3"><FormMessage tone="error">{error.says}</FormMessage></div>}
      {note && <div className="mt-3"><FormMessage tone="ok">{note}</FormMessage></div>}

      <Panel className="mt-4">
        <h3 className="headline-serif text-[18px]">Outcomes from your record</h3>
        <p className="mt-1 text-[12px] text-etyme-muted">Each number is counted from rows on your own record. What is still waiting is shown too.</p>
        {outcomes.length === 0 ? <p className="mt-2 text-[13px] text-etyme-muted">No outcomes yet. Read last week from your record.</p> : (
          <ul className="mt-2 divide-y divide-etyme-rule text-[13px]">{outcomes.map((o) => (
            <li key={o.id} className="py-2">
              <label className="flex items-start gap-2">
                <input type="checkbox" disabled={o.state !== 'MINED'} checked={form.outcomeIds.includes(o.id)} onChange={() => pick(o.id)} />
                <span><span className="text-etyme-ink">{o.title}</span> <span className="text-etyme-muted">week of {o.week} · {STATE[o.state] ?? o.state}</span>
                  <span className="block text-etyme-muted">{o.figures.map((f) => `${f.label}: ${f.value}${f.unit === 'hours' ? ' hours' : ''}`).join(' · ')}</span></span>
              </label>
            </li>))}</ul>
        )}
        {mine('outcomeIds') && <div className="mt-2"><FormMessage tone="error">{mine('outcomeIds')}</FormMessage></div>}
        <div className="mt-3">
          <SubmitButton type="button" tone="secondary" pending={busy === 'mine'} onClick={() => post('/api/outreach/series', { mine: true }, 'mine', (d) => `Read the week of ${d.week}: ${d.outcomes} ${d.outcomes === 1 ? 'outcome' : 'outcomes'}.`)}>Read last week from the record</SubmitButton>
        </div>
      </Panel>

      <Panel className="mt-4">
        <h3 className="headline-serif text-[18px]">Outcome series</h3>
        <p className="mt-1 text-[12px] text-etyme-muted">Every letter is written up front. One yes approves the whole series. Replies go to you.</p>
        {series.length === 0 ? <p className="mt-2 text-[13px] text-etyme-muted">No series yet.</p> : (
          <ul className="mt-2 divide-y divide-etyme-rule text-[13px]">{series.map((s) => (
            <li key={s.id} className="py-2"><span className="text-etyme-ink">{s.name}</span> <span className="text-etyme-muted">{STATE[s.state] ?? s.state} · {s.letters.length} {s.letters.length === 1 ? 'letter' : 'letters'}</span>
              {s.letters.map((l) => <details key={l.position} className="mt-1"><summary>Letter {l.position}, day {l.offsetDays + 1}: {l.subject}</summary><pre className="whitespace-pre-wrap font-sans text-etyme-muted">{l.body}</pre></details>)}
            </li>))}</ul>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" error={mine('name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Segment" error={mine('segmentId')}>
            <Select value={form.segmentId} onChange={(e) => setForm({ ...form, segmentId: e.target.value })}>
              <option value="">Choose a segment</option>
              {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-[12px] text-etyme-muted">Tick the outcomes above that the series tells, in order.</p>
        <div className="mt-3">
          <SubmitButton type="button" tone="secondary" pending={busy === 'series'} onClick={() => post('/api/outreach/series', form, 'series', (d) => `The series has ${d.letters} ${d.letters === 1 ? 'letter' : 'letters'} and one card for one yes.`)}>Ask for one yes for the series</SubmitButton>
        </div>
      </Panel>

      <Panel className="mt-4">
        <h3 className="headline-serif text-[18px]">Post drafts</h3>
        <p className="mt-1 text-[12px] text-etyme-muted">Drafted from your weekly summary. A draft that names a person or a company without its yes is blocked and shows only why.</p>
        {drafts.length === 0 ? <p className="mt-2 text-[13px] text-etyme-muted">No drafts yet.</p> : (
          <ul className="mt-2 divide-y divide-etyme-rule text-[13px]">{drafts.map((d) => (
            <li key={d.id} className="py-2"><span className="text-etyme-ink">{d.title}</span> <span className="text-etyme-muted">{STATE[d.state] ?? d.state}</span>
              {d.state === 'BLOCKED' ? <span className="block text-etyme-muted">{d.reasons.join(' ')}</span> : <pre className="mt-1 whitespace-pre-wrap font-sans text-etyme-muted">{d.body}</pre>}
              {d.brand && <span className="block text-etyme-muted">{d.brand}</span>}
            </li>))}</ul>
        )}
        <div className="mt-3">
          <SubmitButton type="button" tone="secondary" pending={busy === 'draft'} onClick={() => post('/api/outreach/publish', {}, 'draft', (d) => (d.drafted ? 'Drafted this week’s post.' : d.says))}>Draft this week&rsquo;s post</SubmitButton>
        </div>
      </Panel>
    </section>
  )
}
