/**
 * The publish layer (matrix L3.2.2.39): the weekly summary becomes a post
 * draft, the anonymity check reads it, and nothing posts.
 *
 * - A draft that fails the check is BLOCKED with its reasons and opens no
 *   card: it never reaches the owner.
 * - A draft that passes is READY. It opens a card for the owner only once
 *   the brand has a pen name and a channel; until then a card would ask for
 *   a yes nobody can act on.
 * - Posting reads the sales gate first (lead's decision, 2026-11-28), and
 *   the gate is shut, so `publishPost` posts nothing and says why.
 */
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { LedgerRefusal } from '@/lib/record-ledger'
import { openDecision } from '@/lib/decision-items'
import { ownerForRoles } from '@/lib/money/agent-owners'
import { AGENT_HELD_AS } from '@/lib/agents/runner'
import { WEEKLY_SUMMARY_ACTION, WEEKLY_SUMMARY_AGENT } from '@/lib/agents/weekly-summary'
import { SALES_GATE_HELD, gateLets } from '../sales-gate'
import { checkAnonymity } from './anonymity'
import { BRAND_UNSET_SAYS, draftFromSummary, reachesOwner } from './draft-rules'

/** Names the check looks for: everyone this firm holds, and every company on its record with its yes to be named. */
async function namesKnownTo(companyId: string) {
  const [seats, contacts, kept, firm] = await Promise.all([
    prisma.context.findMany({ where: { companyId }, select: { person: { select: { name: true } } } }),
    prisma.companyContact.findMany({ where: { companyId }, select: { name: true, atCompany: { select: { name: true, mayBeNamedInContent: true } } } }),
    prisma.benchListing.findMany({ where: { companyId }, select: { consultant: { select: { person: { select: { name: true } } } } } }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, mayBeNamedInContent: true } }),
  ])
  const personNames = [...seats.map((s) => s.person.name), ...contacts.map((c) => c.name), ...kept.map((k) => k.consultant?.person?.name ?? '')].filter(Boolean)
  const companies = [{ name: firm.name, mayBeNamed: firm.mayBeNamedInContent }, ...contacts.map((c) => ({ name: c.atCompany.name, mayBeNamed: c.atCompany.mayBeNamedInContent }))]
  return { personNames, companies }
}

/** Draft this week's post from the firm's latest weekly summary line. Null where there is no summary on the ledger. */
export async function draftWeeklyPost(companyId: string, now: Date = new Date()) {
  const action = await prisma.recordAction.findFirst({ where: { companyId, agentKey: WEEKLY_SUMMARY_AGENT, action: WEEKLY_SUMMARY_ACTION, createdAt: { lte: now } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
  if (!action) return null
  const have = await prisma.publishDraft.findUnique({ where: { companyId_sourceKind_sourceRef: { companyId, sourceKind: 'WEEKLY_SUMMARY', sourceRef: action.id } } })
  if (have) return have
  const brand = await prisma.publishBrand.findUnique({ where: { companyId } })
  const draft = draftFromSummary({ summaryLine: action.summary, actionId: action.id, weekOf: action.createdAt.toISOString().slice(0, 10), penName: brand?.operatorName ?? null })
  const verdict = checkAnonymity({ text: `${draft.title}\n${draft.body}`, ...(await namesKnownTo(companyId)) })
  const toOwner = reachesOwner({ pass: verdict.pass, penName: brand?.operatorName ?? null, channel: brand?.channel ?? null })
  const row = await prisma.publishDraft.create({ data: {
    companyId, sourceKind: 'WEEKLY_SUMMARY', sourceRef: action.id, title: draft.title, body: draft.body,
    figures: draft.figures as unknown as Prisma.InputJsonValue, state: verdict.pass ? 'READY' : 'BLOCKED',
    anonymityVerdict: { ...verdict, brand: brand?.operatorName && brand.channel ? null : BRAND_UNSET_SAYS } as unknown as Prisma.InputJsonValue,
  } })
  if (!toOwner) return row
  return (await openForOwner(companyId, row.id, row.title, now)) ?? row
}

async function openForOwner(companyId: string, draftId: string, title: string, now: Date) {
  const owner = await ownerForRoles(companyId, [], now)
  const sw = await prisma.agentSwitch.findFirst({ where: { companyId }, orderBy: { id: 'asc' } })
  if (!owner || !sw) return null
  try {
    const item = await openDecision({
      companyId, personId: sw.changedById, heldAs: AGENT_HELD_AS, actingEntityId: null,
      question: `A post draft is ready: "${title}". Read it?`, ownerPersonId: owner, openedOn: now,
      proof: 'It passed the anonymity check. Nothing posts: drafts only.', proofLinks: [{ recordType: 'PublishDraft', recordId: draftId }],
    }, now)
    return prisma.publishDraft.update({ where: { id: draftId }, data: { decisionId: item.id } })
  } catch (e) { if (e instanceof LedgerRefusal) return null; throw e }
}

/** Post a draft. The sales gate is read first; while it is shut nothing posts. */
export async function publishPost(companyId: string, draftId: string): Promise<{ posted: false; says: string }> {
  const draft = await prisma.publishDraft.findFirst({ where: { id: draftId, companyId } })
  if (!draft) return { posted: false, says: 'There is no such draft at your firm.' }
  if (!gateLets('PUBLISH_POST')) return { posted: false, says: `Nothing was posted, ${SALES_GATE_HELD}.` }
  // Drafts only: no channel is wired, so even with the gate open nothing posts from here.
  return { posted: false, says: 'Nothing was posted: no channel is chosen yet.' }
}

/** The firm's drafts for the page. A BLOCKED draft shows only its reasons: its words never reach anyone. */
export async function draftsOf(companyId: string) {
  const rows = await prisma.publishDraft.findMany({ where: { companyId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20 })
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.state === 'BLOCKED' ? null : r.body, state: r.state, reasons: ((r.anonymityVerdict ?? {}) as { reasons?: string[] }).reasons ?? [], brand: ((r.anonymityVerdict ?? {}) as { brand?: string | null }).brand ?? null }))
}
