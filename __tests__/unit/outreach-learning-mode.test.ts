/**
 * Learning mode for advanced outreach (matrix L3.2.2.31, L3.2.2.39, L3.2.2.40), pure:
 * the sales gate, outcome mining's proof, the series letter's locked format,
 * the anonymity check, and trade hours.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SALES_GATE_OPEN, gateLets, salesGate } from '@/lib/outreach/sales-gate'
import { everyFigureTraces, figureTraces, mineWeek } from '@/lib/outreach/outcome-mining-rules'
import { draftSeriesLetter, readSeriesAsk } from '@/lib/outreach/series-rules'
import { checkAnonymity } from '@/lib/outreach/publish/anonymity'
import { draftFromSummary, reachesOwner } from '@/lib/outreach/publish/draft-rules'
import { outsideTradeHours, tradeHoursOf } from '@/lib/outreach/trade-hours'

describe('the sales gate', () => {
  it('is shut, and no pack, series email or post may leave while it is', () => {
    expect(SALES_GATE_OPEN).toBe(false)
    expect(salesGate().open).toBe(false)
    expect(gateLets('PACK')).toBe(false); expect(gateLets('OUTCOME_SERIES')).toBe(false); expect(gateLets('PUBLISH_POST')).toBe(false)
  })
  it('is a constant in code that no route, setting or column reads to open it', () => {
    const src = readFileSync('src/lib/outreach/sales-gate.ts', 'utf8')
    expect(src).toMatch(/export const SALES_GATE_OPEN = false as const/)
    expect(src).not.toMatch(/prisma|process\.env/)
  })
  it('basic letters never read the gate: the direct letter and the candidate update rules do not import it', () => {
    for (const f of ['src/lib/outreach/direct-rules.ts', 'src/lib/outreach/candidate-rules.ts', 'src/lib/outreach/party-letters.ts']) expect(readFileSync(f, 'utf8')).not.toMatch(/sales-gate/)
  })
})

describe('outcome mining', () => {
  const facts = {
    decisions: [{ id: 'd1', verdict: 'APPROVED' as const }, { id: 'd2', verdict: 'REJECTED' as const }],
    decisionsStillOpen: [{ id: 'd0' }],
    cutWeeks: [{ id: 't1', filed: 40, accepted: 37.5 }, { id: 't2', filed: 40, accepted: 40 }],
    acceptedWeeks: [{ id: 't1' }, { id: 't2' }],
    waitingWeeks: [{ id: 't3' }],
  }
  it('every outcome figure traces: its value is exactly the sum of the rows it names', () => {
    const out = mineWeek(facts)
    expect(out.map((o) => o.kind)).toEqual(['DECISIONS_RESOLVED', 'HOURS_CAUGHT', 'WEEKS_ACCEPTED'])
    for (const o of out) for (const f of o.figures) expect(figureTraces(f)).toBe(true)
    const caught = out.find((o) => o.kind === 'HOURS_CAUGHT')!
    expect(caught.figures[0]).toMatchObject({ value: 2.5, unit: 'hours', proof: [{ recordType: 'Timesheet', recordId: 't1', amount: 2.5 }] })
  })
  it('the failure is part of the outcome: what is still waiting is counted and marked', () => {
    const weeks = mineWeek(facts).find((o) => o.kind === 'WEEKS_ACCEPTED')!
    expect(weeks.failureIncluded).toBe(true)
    expect(weeks.figures.find((f) => f.failure)).toMatchObject({ value: 1, proof: [{ recordId: 't3' }] })
  })
  it('a figure whose value is not the sum of its rows does not trace, and a figure with a value and no rows does not either', () => {
    expect(figureTraces({ label: 'x', value: 3, unit: 'count', proof: [{ recordType: 'Timesheet', recordId: 'a', amount: 1 }] })).toBe(false)
    expect(figureTraces({ label: 'x', value: 2, unit: 'count', proof: [] })).toBe(false)
    expect(everyFigureTraces([{ label: 'x', value: 0, unit: 'count', proof: [] }])).toBe(false)
  })
  it('a quiet week holds no outcome rather than an outcome of zeros', () => {
    expect(mineWeek({ decisions: [], decisionsStillOpen: [], cutWeeks: [], acceptedWeeks: [], waitingWeeks: [] })).toEqual([])
  })
})

describe('the outcome series letter', () => {
  const o = { id: 'o1', kind: 'WEEKS_ACCEPTED' as const, title: '2 weeks of hours accepted and ready to bill', failureIncluded: true, lesson: 'A week accepted on time is a bill sent on time.',
    figures: [{ label: 'Weeks accepted', value: 2, unit: 'count' as const, proof: [{ recordType: 'Timesheet', recordId: 'a', amount: 1 }, { recordType: 'Timesheet', recordId: 'b', amount: 1 }] },
      { label: 'Weeks still waiting for acceptance', value: 1, unit: 'count' as const, failure: true, proof: [{ recordType: 'Timesheet', recordId: 'c', amount: 1 }] }] }
  it('is written by a named person, with the real numbers, what went wrong, one small step and a reply that reaches that person', () => {
    const l = draftSeriesLetter(o, { position: 2, writer: 'Pat Writer', firm: 'Sample Firm' })
    expect(l.body).toMatch(/^Pat Writer here, from Sample Firm\./)
    expect(l.body).toContain('- Weeks accepted: 2')
    expect(l.body).toContain('What went wrong: Weeks still waiting for acceptance: 1.')
    expect(l.body).toContain('One small step: Approve one timesheet that is waiting on you.')
    expect(l.body).toContain('Reply to this letter and it reaches Pat Writer.')
    expect(l).toMatchObject({ onboardingStep: 'first-approval', offsetDays: 7, proofChecked: true })
  })
  it('is proof-checked only when every figure traces', () => {
    const bad = { ...o, figures: [{ ...o.figures[0], value: 5 }] }
    expect(draftSeriesLetter(bad, { position: 1, writer: 'Pat Writer', firm: 'Sample Firm' }).proofChecked).toBe(false)
  })
  it('a series with no outcome is refused naming the field', () => {
    expect(readSeriesAsk({ name: 'A', segmentId: 's', outcomeIds: [] })).toMatchObject({ ok: false, field: 'outcomeIds' })
  })
})

describe('the anonymity check', () => {
  const known = { personNames: ['Robin Ashgrove'], companies: [{ name: 'Harbor Mills', mayBeNamed: false }, { name: 'Open Fields', mayBeNamed: true }] }
  it('blocks a draft that names a person, even by surname alone', () => {
    expect(checkAnonymity({ text: 'This week Ashgrove approved twelve weeks.', ...known })).toMatchObject({ pass: false, reasons: ['It names a person.'] })
  })
  it('blocks a draft that names a client without its yes, and lets one through that said yes', () => {
    expect(checkAnonymity({ text: 'Harbor Mills paid on time.', ...known }).pass).toBe(false)
    expect(checkAnonymity({ text: 'Open Fields paid on time.', ...known }).pass).toBe(true)
  })
  it('blocks an email address, a web address, a phone number, a face or voice, and the writer’s own employer', () => {
    for (const t of ['write to a@b.example', 'see www.sample.example', 'call 555 123 4567', 'here is my photo', 'my day job is in banking']) expect(checkAnonymity({ text: t, ...known }).pass).toBe(false)
  })
  it('passes the week’s own counts, which name nobody', () => {
    expect(checkAnonymity({ text: draftFromSummary({ summaryLine: 'This week: 3 customers active, 1 dormant.', actionId: 'r1', weekOf: '2026-11-22', penName: null }).body, ...known }).pass).toBe(true)
  })
  it('a draft reaches the owner only when it passed and a pen name and a channel are chosen', () => {
    expect(reachesOwner({ pass: false, penName: 'P', channel: 'C' })).toBe(false)
    expect(reachesOwner({ pass: true, penName: null, channel: null })).toBe(false)
    expect(reachesOwner({ pass: true, penName: 'P', channel: 'C' })).toBe(true)
  })
  it('the post’s one figure links to the weekly summary row on the ledger', () => {
    expect(draftFromSummary({ summaryLine: 'This week: x', actionId: 'r1', weekOf: '2026-11-22', penName: null }).figures[0].proof).toEqual([{ recordType: 'RecordAction', recordId: 'r1' }])
  })
})

describe('trade hours', () => {
  it('are unset for every firm, and a campaign never sends while they are unset', () => {
    expect(tradeHoursOf('any')).toBeNull()
    expect(outsideTradeHours(null, new Date())).toBe(false)
  })
  it('once set, a campaign may send only outside them, in the firm’s own time zone', () => {
    const th = { start: '08:00', end: '18:00', timeZone: 'UTC' }
    expect(outsideTradeHours(th, new Date('2026-11-30T12:00:00Z'))).toBe(false)
    expect(outsideTradeHours(th, new Date('2026-11-30T19:00:00Z'))).toBe(true)
  })
})
