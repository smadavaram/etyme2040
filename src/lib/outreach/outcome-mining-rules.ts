/**
 * Outcome mining's rules (matrix L3.2.2.31, record 117). Pure.
 *
 * An outcome is one thing that happened on a firm's own record in one week:
 * decisions resolved, hours caught before they were billed, weeks accepted.
 * Every figure names the rows it was counted from, and each row carries the
 * amount it adds. A figure traces only where its value is exactly the sum of
 * its rows. A figure that does not trace is dropped, never drafted. The
 * failure is part of the outcome: what is still waiting is a figure too.
 * Hours, never dollars: a dollar figure would need the contract rate, and an
 * outcome is not the place to work out money.
 */

export type OutcomeKind = 'DECISIONS_RESOLVED' | 'HOURS_CAUGHT' | 'WEEKS_ACCEPTED'

export interface ProofRow { recordType: string; recordId: string; amount: number }
export interface OutcomeFigure { label: string; value: number; unit: 'count' | 'hours'; failure?: boolean; proof: ProofRow[] }
export interface MinedOutcome { kind: OutcomeKind; title: string; figures: OutcomeFigure[]; failureIncluded: boolean; lesson: string }

const round2 = (n: number) => Math.round(n * 100) / 100

/** Whether a figure's value is exactly the sum of the rows behind it. A figure of zero traces with no rows. */
export function figureTraces(f: OutcomeFigure): boolean {
  if (!Array.isArray(f.proof)) return false
  if (f.proof.some((p) => !p.recordType || !p.recordId || !Number.isFinite(p.amount))) return false
  if (f.value !== 0 && f.proof.length === 0) return false
  return round2(f.proof.reduce((n, p) => n + p.amount, 0)) === round2(f.value)
}

/** Keep only the figures that trace. */
export const provedFigures = (figures: readonly OutcomeFigure[]): OutcomeFigure[] => figures.filter(figureTraces)

/** Every figure traces, and there is at least one that is not zero. */
export const everyFigureTraces = (figures: readonly OutcomeFigure[]): boolean =>
  figures.length > 0 && figures.every(figureTraces) && figures.some((f) => f.value !== 0)

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

export interface WeekFacts {
  decisions: { id: string; verdict: 'APPROVED' | 'REJECTED' }[]
  decisionsStillOpen: { id: string }[]
  /** Weeks accepted with fewer hours than filed: the hours cut are the difference. */
  cutWeeks: { id: string; filed: number; accepted: number }[]
  acceptedWeeks: { id: string }[]
  /** Weeks filed before this one ended and still not accepted: the failure. */
  waitingWeeks: { id: string }[]
}

/** The outcomes one week holds, each with its proof. An outcome with nothing to show is left out. */
export function mineWeek(f: WeekFacts): MinedOutcome[] {
  const out: MinedOutcome[] = []
  const one = (recordType: string) => (r: { id: string }): ProofRow => ({ recordType, recordId: r.id, amount: 1 })

  if (f.decisions.length) {
    const figures: OutcomeFigure[] = [
      { label: 'Decisions made', value: f.decisions.length, unit: 'count', proof: f.decisions.map(one('DecisionItem')) },
      { label: 'Decisions still open from before', value: f.decisionsStillOpen.length, unit: 'count', failure: true, proof: f.decisionsStillOpen.map(one('DecisionItem')) },
    ]
    out.push({
      kind: 'DECISIONS_RESOLVED', title: `${n(f.decisions.length, 'decision', 'decisions')} made in one week`, figures: provedFigures(figures),
      failureIncluded: f.decisionsStillOpen.length > 0,
      lesson: 'A decision with one named owner gets made. The ones still open have nobody chasing them yet.',
    })
  }

  const cut = f.cutWeeks.filter((w) => w.accepted < w.filed)
  if (cut.length) {
    const figures: OutcomeFigure[] = [
      { label: 'Hours caught before billing', value: round2(cut.reduce((s, w) => s + (w.filed - w.accepted), 0)), unit: 'hours', proof: cut.map((w) => ({ recordType: 'Timesheet', recordId: w.id, amount: round2(w.filed - w.accepted) })) },
      { label: 'Weeks corrected', value: cut.length, unit: 'count', proof: cut.map(one('Timesheet')) },
    ]
    out.push({
      kind: 'HOURS_CAUGHT', title: `${n(figures[0].value, 'hour', 'hours')} caught before anyone was billed`, figures: provedFigures(figures),
      failureIncluded: false, lesson: 'The week is checked once, before the bill. Fixing it after the bill costs a credit note and a phone call.',
    })
  }

  if (f.acceptedWeeks.length || f.waitingWeeks.length) {
    const figures: OutcomeFigure[] = [
      { label: 'Weeks accepted', value: f.acceptedWeeks.length, unit: 'count', proof: f.acceptedWeeks.map(one('Timesheet')) },
      { label: 'Weeks still waiting for acceptance', value: f.waitingWeeks.length, unit: 'count', failure: true, proof: f.waitingWeeks.map(one('Timesheet')) },
    ]
    out.push({
      kind: 'WEEKS_ACCEPTED', title: `${n(f.acceptedWeeks.length, 'week', 'weeks')} of hours accepted and ready to bill`, figures: provedFigures(figures),
      failureIncluded: f.waitingWeeks.length > 0,
      lesson: 'A week accepted on time is a bill sent on time. A week left waiting is cash that arrives late.',
    })
  }
  return out.filter((o) => everyFigureTraces(o.figures))
}

/** The one small step a reader can take after each kind of outcome, mapped to an onboarding step. */
export const ONBOARDING_STEP: Record<OutcomeKind, { key: string; says: string }> = {
  DECISIONS_RESOLVED: { key: 'invite-approver', says: 'Invite the one person who approves timesheets at your firm.' },
  HOURS_CAUGHT: { key: 'first-week', says: 'File one real week of hours for one contractor.' },
  WEEKS_ACCEPTED: { key: 'first-approval', says: 'Approve one timesheet that is waiting on you.' },
}
