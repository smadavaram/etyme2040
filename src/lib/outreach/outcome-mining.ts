/**
 * Outcome mining (matrix L3.2.2.31; lib/outreach/outcome-mining-rules).
 *
 * Once a week, from the firm's own record only: decisions made, hours caught
 * before billing, weeks accepted, and what is still waiting. Each outcome is
 * kept as an `OutreachOutcome` row whose figures name the rows they were
 * counted from. Nothing here sends, and nothing reads another firm's book.
 */
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { firmZone, todayIn } from '@/lib/decision-items'
import { everyFigureTraces, mineWeek, type OutcomeFigure } from './outcome-mining-rules'

const DAY = 86_400_000

/** The last whole Sunday-to-Saturday week before the firm's today: [Sunday, next Sunday). Pure. */
export function lastWholeWeek(today: Date): { from: Date; to: Date; key: string } {
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - today.getUTCDay()))
  const from = new Date(to.getTime() - 7 * DAY)
  return { from, to, key: from.toISOString().slice(0, 10) }
}

/** Mine last week's outcomes for one firm and keep them. An outcome already drafted is left as it is. */
export async function mineOutcomes(companyId: string, now: Date = new Date()) {
  const week = lastWholeWeek(todayIn(await firmZone(companyId), now))
  const inWeek = { gte: week.from, lt: week.to }
  const [decisions, stillOpen, accepted, waiting] = await Promise.all([
    prisma.decisionItem.findMany({ where: { companyId, decidedAt: inWeek, state: { in: ['APPROVED', 'REJECTED'] } }, select: { id: true, state: true } }),
    prisma.decisionItem.findMany({ where: { companyId, state: 'OPEN', openedOn: { lt: week.from } }, select: { id: true } }),
    prisma.timesheet.findMany({ where: { sellContract: { companyId }, employerAcceptedAt: inWeek }, select: { id: true, totalHours: true, acceptedHours: true } }),
    prisma.timesheet.findMany({ where: { sellContract: { companyId }, status: 'SUBMITTED', employerAcceptedAt: null, periodStart: { lt: week.to } }, select: { id: true } }),
  ])
  const mined = mineWeek({
    decisions: decisions.map((d) => ({ id: d.id, verdict: d.state as 'APPROVED' | 'REJECTED' })),
    decisionsStillOpen: stillOpen,
    cutWeeks: accepted.filter((t) => t.acceptedHours !== null).map((t) => ({ id: t.id, filed: Number(t.totalHours), accepted: Number(t.acceptedHours) })),
    acceptedWeeks: accepted.map((t) => ({ id: t.id })),
    waitingWeeks: waiting,
  })
  const kept = []
  for (const o of mined) {
    const where = { companyId_kind_sourceKey: { companyId, kind: o.kind, sourceKey: week.key } }
    const have = await prisma.outreachOutcome.findUnique({ where })
    if (have && have.state !== 'MINED') { kept.push(have); continue }
    const data = { title: o.title, figures: o.figures as unknown as Prisma.InputJsonValue, failureIncluded: o.failureIncluded, lesson: o.lesson, minedForWeek: week.key }
    kept.push(have
      ? await prisma.outreachOutcome.update({ where: { id: have.id }, data })
      : await prisma.outreachOutcome.create({ data: { companyId, kind: o.kind, sourceKey: week.key, ...data } }))
  }
  return { week: week.key, outcomes: kept }
}

/**
 * Whether every figure traces to rows on this firm's own record: the
 * arithmetic holds, and each row named is there and is the firm's.
 */
export async function figuresTraceOnRecord(companyId: string, figures: readonly OutcomeFigure[]): Promise<boolean> {
  if (!everyFigureTraces(figures)) return false
  const rows = figures.flatMap((f) => f.proof)
  const ids = (t: string) => [...new Set(rows.filter((r) => r.recordType === t).map((r) => r.recordId))]
  if (rows.some((r) => r.recordType !== 'DecisionItem' && r.recordType !== 'Timesheet')) return false
  const [d, t] = await Promise.all([
    prisma.decisionItem.count({ where: { companyId, id: { in: ids('DecisionItem') } } }),
    prisma.timesheet.count({ where: { sellContract: { companyId }, id: { in: ids('Timesheet') } } }),
  ])
  return d === ids('DecisionItem').length && t === ids('Timesheet').length
}
