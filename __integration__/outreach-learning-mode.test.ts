/**
 * Learning mode for advanced outreach (matrix L3.2.2.31, L3.2.2.39, L3.2.2.40),
 * on the database through the real routes, the real task record and the real
 * agent: the sales gate holds every pack and series, a series is one pack
 * approved once, outcomes trace to the firm's own rows, a post draft that
 * names somebody never reaches the owner, and a reply opens a decision for
 * the named person. Builds its own firm on reserved domains; the provider is a stub.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { prisma, resetDatabase, as, req, json } from './harness'
import * as item from '@/app/api/decision-items/[id]/route'
import * as segmentsRoute from '@/app/api/outreach/segments/route'
import * as packsRoute from '@/app/api/outreach/packs/route'
import * as seriesRoute from '@/app/api/outreach/series/route'
import * as publishRoute from '@/app/api/outreach/publish/route'
import * as interest from '@/app/api/answer/outreach-interest/[token]/route'
import { decideBody } from '@/lib/decision-queue'
import { openDecision } from '@/lib/decision-items'
import { runAgent, registerAgent, unregisterAgent } from '@/lib/agents/runner'
import { outreachBatchAgent, walkOutreachBatches } from '@/lib/agents/outreach-batch'
import { sendMail } from '@/lib/notify/mail-door'
import { interestedUrlFor } from '@/lib/notify/outreach-interest'
import { syncPack } from '@/lib/outreach/pack'
import { figuresTraceOnRecord } from '@/lib/outreach/outcome-mining'
import { publishPost } from '@/lib/outreach/publish/draft'
import { SALES_GATE_HELD, SALES_GATE_HELD_ACTION } from '@/lib/outreach/sales-gate'

process.env.NEXTAUTH_SECRET ||= 'test-secret-for-outreach-learning'
process.env.NEXTAUTH_URL = 'https://etyme.example'
const tag = `olm${Date.now()}`
const w: Record<string, any> = {}
const KEY = 'outreach-batch'
const DAY = 86_400_000
const day = (n: number) => new Date(Date.now() - n * DAY)
const sent: { to: string[]; replyTo: string | null }[] = []
const deps = {
  env: { NOTIFY_FROM_EMAIL: 'hello@etyme.example', RESEND_API_KEY: 'k' }, isDemo: () => false,
  hand: async (e: any) => { sent.push({ to: e.to, replyTo: e.replyTo ?? null }); return { provider: 'Resend' as const, messageId: 'm' } },
}
/** The agent exactly as the cron registers it: no seam, the gate as it is. */
const runReal = () => { registerAgent(KEY, { ruleVersion: 't', step: (ctx) => outreachBatchAgent.step({ ...ctx }) }); return runAgent(KEY, w.firm.id, new Date()) }
const runAsIfOpen = () => { registerAgent(KEY, { ruleVersion: 't', step: (ctx) => walkOutreachBatches(ctx, { send: (m) => sendMail(m, deps as any), gradeAsIfOpen: true }) }); return runAgent(KEY, w.firm.id, new Date()) }
const p = (id: string) => ({ params: Promise.resolve({ id }) })
const as2 = (who: any) => as(who.primaryEmail)
const post = async (route: any, url: string, body: unknown, who = w.owner) => { as2(who); return json(await route.POST(req('POST', url, body))) }
const get = async (route: any, url: string, who = w.owner) => { as2(who); return json(await route.GET(req('GET', url))) }
const approve = async (decisionId: string) => { as2(w.owner); return json(await item.POST(req('POST', `/api/decision-items/${decisionId}`, decideBody('APPROVE', '', w.entity.id)), p(decisionId))) }
const newCo = (name: string, extra: Record<string, unknown> = {}) => prisma.company.create({ data: { name: `${name} ${tag}`, slug: `olm-${name.toLowerCase().replace(/\s/g, '-')}-${tag}`, kind: 'CLIENT', ...extra } as any })

beforeAll(async () => {
  await resetDatabase()
  // The plugin stays off: learning mode runs with Outreach off for every firm.
  w.firm = await newCo('Sample Firm', { kind: 'VENDOR', siteLiveAt: null, pluginsOn: [] })
  w.entity = await prisma.legalEntity.create({ data: { companyId: w.firm.id, name: 'Sample Firm LLC', country: 'US', currency: 'USD' } })
  await prisma.companyAddress.create({ data: { companyId: w.firm.id, kind: 'LEGAL', street: '1 Sample Way', city: 'Springfield', state: 'IL', postalCode: '62701', country: 'US' } })
  const ownerRole = await prisma.role.create({ data: { companyId: w.firm.id, name: 'Owner', permissions: ['*'] } })
  const amRole = await prisma.role.create({ data: { companyId: w.firm.id, name: 'Recruiter', permissions: ['vendors.read'] } })
  w.owner = await prisma.person.create({ data: { name: 'Dana Owner', primaryEmail: `dana.${tag}@example.invalid` } })
  w.am = await prisma.person.create({ data: { name: 'Robin Ashgrove', primaryEmail: `robin.${tag}@example.invalid` } })
  await prisma.context.create({ data: { personId: w.owner.id, companyId: w.firm.id, type: 'EMPLOYEE', roleId: ownerRole.id } as any })
  await prisma.context.create({ data: { personId: w.am.id, companyId: w.firm.id, type: 'EMPLOYEE', roleId: amRole.id } as any })
  await prisma.agentSwitch.create({ data: { companyId: w.firm.id, agentKey: KEY, state: 'ON', dailyCap: null, changedById: w.owner.id } })

  w.client = await newCo('Harbor Mills')
  await prisma.counterparty.create({ data: { companyId: w.firm.id, otherCompanyId: w.client.id, relationship: 'CLIENT', status: 'ACTIVE', createdAt: day(400) } })
  w.contact = await prisma.companyContact.create({ data: { companyId: w.firm.id, atCompanyId: w.client.id, name: 'Lee Contact', email: `lee.${tag}@example.invalid`, kind: 'HIRING_MANAGER' } })
  const seg = await post(segmentsRoute, '/api/outreach/segments', { name: 'Clients', role: 'CLIENT' })
  expect(seg.status).toBe(201)
  w.segment = seg.body.data.id

  // Two decisions the firm made last week, and one left open from before: the record outcome mining reads.
  for (const [i, verdict] of (['APPROVED', 'REJECTED'] as const).entries()) {
    const d = await openDecision({ companyId: w.firm.id, personId: w.owner.id, heldAs: 'Owner', actingEntityId: w.entity.id, question: `Sample decision ${i}`, ownerPersonId: w.owner.id, openedOn: day(20), proof: 'test', proofLinks: [] }, day(20))
    const sunday = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - new Date().getUTCDay() - 4))
    await prisma.decisionItem.update({ where: { id: d.id }, data: { state: verdict, decidedAt: sunday } })
  }
  w.stillOpen = await openDecision({ companyId: w.firm.id, personId: w.owner.id, heldAs: 'Owner', actingEntityId: w.entity.id, question: 'Sample decision left open', ownerPersonId: w.owner.id, openedOn: day(30), proof: 'test', proofLinks: [] }, day(30))
})
afterEach(() => { unregisterAgent(KEY) })

describe('every outcome figure traces to ledger rows', () => {
  it('reading last week finds the decisions made and the one still open, each figure naming the firm’s own rows', async () => {
    const out = await post(seriesRoute, '/api/outreach/series', { mine: true })
    expect(out.status).toBe(200)
    const rows = await prisma.outreachOutcome.findMany({ where: { companyId: w.firm.id } })
    expect(rows.map((r) => r.kind)).toEqual(['DECISIONS_RESOLVED'])
    const figures = rows[0].figures as any[]
    expect(figures[0]).toMatchObject({ label: 'Decisions made', value: 2 })
    expect(figures[1]).toMatchObject({ failure: true, value: 1, proof: [{ recordType: 'DecisionItem', recordId: w.stillOpen.id, amount: 1 }] })
    expect(rows[0].failureIncluded).toBe(true)
    expect(await figuresTraceOnRecord(w.firm.id, figures)).toBe(true)
    w.outcome = rows[0]
  })
  it('a figure naming a row of another firm does not trace on this firm’s record', async () => {
    const other = await newCo('Other Firm')
    const theirs = await openDecision({ companyId: other.id, personId: w.owner.id, heldAs: 'Owner', actingEntityId: null, question: 'Theirs', ownerPersonId: w.owner.id, openedOn: day(2), proof: 'x', proofLinks: [] }, day(2)).catch(() => null)
    const id = theirs?.id ?? 'not-a-row'
    expect(await figuresTraceOnRecord(w.firm.id, [{ label: 'x', value: 1, unit: 'count', proof: [{ recordType: 'DecisionItem', recordId: id, amount: 1 }] }])).toBe(false)
  })
})

describe('a pack is approved once', () => {
  it('an outcome series is one pack: every letter written up front, one task and one card, replies named to one person', async () => {
    const out = await post(seriesRoute, '/api/outreach/series', { name: 'What the record showed', segmentId: w.segment, outcomeIds: [w.outcome.id], replyOwnerPersonId: w.am.id })
    expect(out.status).toBe(201)
    w.series = out.body.data.id
    const pack = await prisma.outreachPack.findUniqueOrThrow({ where: { id: w.series } })
    expect(pack).toMatchObject({ kind: 'OUTCOME_SERIES', replyOwnerPersonId: w.am.id, state: 'PROPOSED' })
    const letters = await prisma.outreachSeriesEmail.findMany({ where: { packId: pack.id } })
    expect(letters).toHaveLength(1)
    expect(letters[0].proofChecked).toBe(true)
    expect(letters[0].body).toContain('Robin Ashgrove here, from')
    expect(await prisma.agentTask.count({ where: { companyId: w.firm.id, kind: 'OUTREACH_PACK' } })).toBe(1)
    const task = await prisma.agentTask.findUniqueOrThrow({ where: { id: pack.agentTaskId! } })
    const card = await prisma.decisionItem.findUniqueOrThrow({ where: { id: task.decisionId } })
    expect(card.question).toContain('one yes for all of them')
    expect(card.proof).toContain('Waits for trade hours to be set.')
    expect((task.payload as any).replyTo).toBe(w.am.primaryEmail)
    w.seriesDecision = task.decisionId
  })
  it('one yes approves the whole series, and approving asks nothing more', async () => {
    const before = await prisma.decisionItem.count({ where: { companyId: w.firm.id, state: 'OPEN' } })
    expect((await approve(w.seriesDecision)).status).toBe(200)
    expect((await syncPack(w.series)).state).toBe('APPROVED')
    expect(await prisma.decisionItem.count({ where: { companyId: w.firm.id, state: 'OPEN' } })).toBe(before - 1)
  })
  it('an outcome already in a series cannot go in a second one', async () => {
    const out = await post(seriesRoute, '/api/outreach/series', { name: 'Again', segmentId: w.segment, outcomeIds: [w.outcome.id] })
    expect(out.status).toBe(422); expect(out.body.error.field).toBe('outcomeIds')
  })
})

describe('no pack, series email or post leaves while the gate is shut', () => {
  it('an approved push pack with a letter ready, and the approved series, send nothing, and each task says it is held by the sales gate once', async () => {
    const proposed = await post(packsRoute, '/api/outreach/packs', { name: 'Proof for clients', segmentId: w.segment, contentKinds: ['OUTCOME_PROOF'] })
    expect(proposed.status).toBe(201)
    w.pack = proposed.body.data.id
    const pack = await prisma.outreachPack.findUniqueOrThrow({ where: { id: w.pack } })
    expect(pack).toMatchObject({ kind: 'PUSH', replyOwnerPersonId: w.owner.id })
    const task = await prisma.agentTask.findUniqueOrThrow({ where: { id: pack.agentTaskId! } })
    expect((await approve(task.decisionId)).status).toBe(200)
    const letter = await prisma.outreachLetter.create({ data: { companyId: w.firm.id, agentTaskId: task.id, contactId: w.contact.id, atCompanyId: w.client.id, email: w.contact.email, state: 'READY' } })
    await prisma.agentTask.update({ where: { id: task.id }, data: { payload: { ...(task.payload as any), letterContent: { [letter.id]: { pushId: 'p', subject: 'Proof', body: 'What the record showed.', page: null } } } } })
    await prisma.company.update({ where: { id: w.firm.id }, data: { pluginsOn: ['OUTREACH'] } })
    w.letter = letter
    sent.length = 0
    await runReal(); await runReal()
    expect(sent).toHaveLength(0)
    expect(await prisma.mailSend.count({ where: { companyId: w.firm.id } })).toBe(0)
    const seriesTask = (await prisma.outreachPack.findUniqueOrThrow({ where: { id: w.series } })).agentTaskId!
    for (const id of [task.id, seriesTask]) {
      const held = await prisma.recordAction.findMany({ where: { companyId: w.firm.id, recordId: id, action: SALES_GATE_HELD_ACTION } })
      expect(held).toHaveLength(1)
      expect(held[0].summary).toContain(SALES_GATE_HELD)
    }
    expect((await prisma.outreachLetter.findUniqueOrThrow({ where: { id: letter.id } })).state).toBe('READY')
  })
  it('graded as if the gate were open, the pack’s letter carries a Reply-To naming the person who answers it', async () => {
    sent.length = 0
    await runAsIfOpen()
    expect(sent).toHaveLength(1)
    expect(sent[0].replyTo).toBe(w.owner.primaryEmail)
    await prisma.company.update({ where: { id: w.firm.id }, data: { pluginsOn: [] } })
  })
})

describe('a draft naming a person or a client without consent never reaches the owner', () => {
  const summary = (text: string, ago: number) => prisma.recordAction.create({ data: { companyId: w.firm.id, recordType: 'Company', recordId: w.firm.id, action: 'WEEKLY_SUMMARY', summary: text, personId: w.owner.id, heldAs: 'Agent', agentKey: 'weekly-summary', createdAt: day(ago) } })
  const postCards = () => prisma.decisionItem.count({ where: { companyId: w.firm.id, question: { contains: 'A post draft is ready' } } })
  it('a summary that names a person is drafted BLOCKED with its reason, opens no card, and shows only why', async () => {
    await summary('This week: Robin Ashgrove closed 3 weeks.', 3)
    const out = await post(publishRoute, '/api/outreach/publish', {})
    expect(out.status).toBe(201); expect(out.body.data.state).toBe('BLOCKED')
    expect(await postCards()).toBe(0)
    const list = await get(publishRoute, '/api/outreach/publish')
    expect(list.body.data.drafts[0]).toMatchObject({ state: 'BLOCKED', body: null, reasons: ['It names a person.'] })
  })
  it('a summary that names a client that has not said yes is blocked too', async () => {
    await summary(`This week: Harbor Mills ${tag} accepted 4 weeks.`, 2)
    const out = await post(publishRoute, '/api/outreach/publish', {})
    expect(out.body.data.state).toBe('BLOCKED')
    expect(await postCards()).toBe(0)
  })
  it('a clean summary is READY and still opens no card while no pen name or channel is chosen', async () => {
    await summary('This week: 3 customers active, 1 dormant.', 1)
    const out = await post(publishRoute, '/api/outreach/publish', {})
    expect(out.body.data.state).toBe('READY')
    expect(await postCards()).toBe(0)
  })
  it('posting a ready draft posts nothing, because the sales gate is shut', async () => {
    const draft = await prisma.publishDraft.findFirstOrThrow({ where: { companyId: w.firm.id, state: 'READY' } })
    expect(await publishPost(w.firm.id, draft.id)).toEqual({ posted: false, says: `Nothing was posted, ${SALES_GATE_HELD}.` })
  })
})

describe('replies open a decision for the named person', () => {
  it('pressing I’m interested on a pack’s letter opens the card for the person the pack names, not the Owner', async () => {
    const pack = await prisma.outreachPack.findUniqueOrThrow({ where: { id: w.pack } })
    await prisma.outreachPack.update({ where: { id: pack.id }, data: { replyOwnerPersonId: w.am.id } })
    const url = interestedUrlFor(w.letter.id)!
    const token = url.slice(url.lastIndexOf('/') + 1)
    const out = await json(await interest.POST(req('POST', `/api/answer/outreach-interest/${token}`, {}), { params: Promise.resolve({ token }) }))
    expect(out.status).toBe(200)
    const card = await prisma.decisionItem.findFirstOrThrow({ where: { companyId: w.firm.id, state: 'OPEN', question: { contains: 'is interested' } } })
    expect(card.ownerPersonId).toBe(w.am.id)
  })
})
