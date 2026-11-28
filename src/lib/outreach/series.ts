/**
 * The outcome series as one pack (matrix L3.2.2.31, L3.2.2.40).
 *
 * An outcome series is an `OutreachPack` of kind OUTCOME_SERIES: every
 * letter is drafted up front as an `OutreachSeriesEmail` row, the whole
 * series is one task and one card, and one person's yes approves all of it
 * (`proposeTask`, read back through `approvalOf` by `syncPack`). Nothing
 * here sends: the walker reads the sales gate before it reads the yes.
 */
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { LedgerRefusal } from '@/lib/record-ledger'
import { ownerForRoles } from '@/lib/money/agent-owners'
import { baseUrl } from '@/lib/signed-link'
import { proposeTask } from '@/lib/agents/tasks'
import { postalLine } from '@/lib/agents/dormant-outreach-rules'
import { OUTREACH_BATCH_AGENT, batchBlock } from './batch-rules'
import { OUTREACH_PACK_KIND, packPlan } from './pack-rules'
import { defOf, type Refusal } from './segment'
import { describeSegment } from './segment-rules'
import { draftSeriesLetter, readSeriesAsk, seriesCard, type SeriesOutcome } from './series-rules'
import type { OutcomeFigure, OutcomeKind } from './outcome-mining-rules'
import { figuresTraceOnRecord } from './outcome-mining'
import { salesGate } from './sales-gate'
import { TRADE_HOURS_UNSET_SAYS, tradeHoursOf } from './trade-hours'

export const PACK_KIND_PUSH = 'PUSH'
export const PACK_KIND_SERIES = 'OUTCOME_SERIES'

const refuse = (says: string, field?: string, status = 422): Refusal => ({ ok: false, status, says, ...(field ? { field } : {}) })

/** The named person who answers a pack's replies: a person with a live seat at this firm, and the address a reply goes to. */
export async function replyOwner(companyId: string, personId: string): Promise<{ id: string; name: string; email: string | null } | null> {
  const seat = await prisma.context.findFirst({ where: { personId, companyId, revokedAt: null }, select: { person: { select: { id: true, name: true, primaryEmail: true } } } })
  return seat ? { id: seat.person.id, name: seat.person.name, email: seat.person.primaryEmail } : null
}

/** Propose a whole outcome series: every letter drafted, one task, one card, one yes. Sends nothing. */
export async function proposeSeries(seat: { companyId: string; personId: string }, raw: unknown, now: Date = new Date()): Promise<Refusal | { ok: true; id: string; taskId: string; letters: number }> {
  const read = readSeriesAsk(raw)
  if (!read.ok) return refuse(read.says, read.field)
  const ask = read.ask
  const segment = await prisma.outreachSegment.findFirst({ where: { id: ask.segmentId, companyId: seat.companyId, archivedAt: null } })
  if (!segment) return refuse('That segment is not at your firm, or it was archived. Choose another.', 'segmentId')
  const def = defOf(segment)
  if (def.role === 'CANDIDATE') return refuse('An outcome series is written to companies. Candidates get update letters, and only after their own yes.', 'segmentId')
  const writer = await replyOwner(seat.companyId, ask.replyOwnerPersonId ?? seat.personId)
  if (!writer) return refuse('The person who answers replies must hold a seat at your firm. Choose somebody who does.', 'replyOwnerPersonId')
  const rows = await prisma.outreachOutcome.findMany({ where: { companyId: seat.companyId, id: { in: ask.outcomeIds } } })
  if (rows.length !== ask.outcomeIds.length) return refuse('One of those outcomes is not on your firm’s record.', 'outcomeIds')
  if (rows.some((r) => r.state !== 'MINED')) return refuse('One of those outcomes is already in another series, or was dropped.', 'outcomeIds')
  const firm = await prisma.company.findUniqueOrThrow({ where: { id: seat.companyId }, select: { name: true } })
  const addrs = await prisma.companyAddress.findMany({ where: { companyId: seat.companyId } })
  const postal = postalLine(addrs.find((a) => a.kind === 'LEGAL') ?? addrs.find((a) => a.kind === 'BILLING') ?? null)
  const block = batchBlock({ postal, base: baseUrl() })
  if (block || !postal) return refuse(block?.says ?? 'The firm has no postal address on record.', 'postal')

  const ordered = ask.outcomeIds.map((id) => rows.find((r) => r.id === id)!)
  const letters = ordered.map((r, i) => draftSeriesLetter(
    { id: r.id, kind: r.kind as OutcomeKind, title: r.title, figures: r.figures as unknown as OutcomeFigure[], failureIncluded: r.failureIncluded, lesson: r.lesson } satisfies SeriesOutcome,
    { position: i + 1, writer: writer.name, firm: firm.name },
  ))
  // Proof from the record only: every figure's arithmetic holds and every row it names is this firm's.
  for (const [i, r] of ordered.entries()) {
    const traces = letters[i].proofChecked && await figuresTraceOnRecord(seat.companyId, r.figures as unknown as OutcomeFigure[])
    if (!traces) return refuse(`The outcome "${r.title}" has a figure that does not trace to your record, so it cannot go in a series.`, 'outcomeIds')
  }
  const owner = await ownerForRoles(seat.companyId, ['Account Manager'], now)
  if (!owner) return refuse('No Account Manager or Owner seat is working, so nobody can say yes to this series.', 'name')
  const card = seriesCard({ name: ask.name, segmentWords: describeSegment(def), letters, writer: writer.name, tradeHoursSays: tradeHoursOf(seat.companyId) ? null : TRADE_HOURS_UNSET_SAYS, gateSays: salesGate().says })
  const payloadOf = (packId: string) => ({ pack: true, series: true, packId, side: 'CUSTOMER', subject: ask.name, body: '', replyTo: writer.email, letterContent: {} }) as unknown as Prisma.InputJsonValue
  let packId = ''
  try {
    const task = await proposeTask({
      companyId: seat.companyId, agentKey: OUTREACH_BATCH_AGENT, kind: OUTREACH_PACK_KIND, recordType: 'Company', recordId: seat.companyId,
      plan: { ...packPlan(def.role), retries: 0 }, ownerPersonId: owner, openedOn: now, today: now, question: card.question, detail: card.detail,
      payload: payloadOf(''),
      withTask: async (tx, taskId) => {
        const pack = await tx.outreachPack.create({ data: {
          companyId: seat.companyId, name: ask.name, segmentId: segment.id, contentKinds: ['OUTCOME_PROOF'], kind: PACK_KIND_SERIES,
          replyOwnerPersonId: writer.id, state: 'PROPOSED', agentTaskId: taskId, createdById: seat.personId,
        } })
        packId = pack.id
        for (const l of letters) await tx.outreachSeriesEmail.create({ data: { packId: pack.id, position: l.position, outcomeId: l.outcomeId, subject: l.subject, body: l.body, onboardingStep: l.onboardingStep, offsetDays: l.offsetDays, proofChecked: l.proofChecked } })
        await tx.outreachOutcome.updateMany({ where: { id: { in: ask.outcomeIds } }, data: { state: 'DRAFTED' } })
        await tx.agentTask.update({ where: { id: taskId }, data: { payload: payloadOf(pack.id) } })
      },
    })
    return { ok: true, id: packId, taskId: task.id, letters: letters.length }
  } catch (e) {
    if (e instanceof LedgerRefusal) return refuse(e.message)
    throw e
  }
}

/** The firm's series and their letters, for the page. */
export async function seriesOf(companyId: string) {
  const packs = await prisma.outreachPack.findMany({ where: { companyId, kind: PACK_KIND_SERIES }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20 })
  const letters = await prisma.outreachSeriesEmail.findMany({ where: { packId: { in: packs.map((p) => p.id) } }, orderBy: [{ packId: 'asc' }, { position: 'asc' }] })
  return packs.map((p) => ({ id: p.id, name: p.name, state: p.state, replyOwnerPersonId: p.replyOwnerPersonId, letters: letters.filter((l) => l.packId === p.id).map((l) => ({ position: l.position, subject: l.subject, body: l.body, onboardingStep: l.onboardingStep, offsetDays: l.offsetDays, proofChecked: l.proofChecked })) }))
}
