import { describe, it, expect, beforeAll } from 'vitest'
import { prisma, resetDatabase } from './harness'
import { activateTenant, createAffiliate } from '@/lib/money/affiliate-registry'
import { markSubscriptionPaid, markReversal } from '@/lib/money/affiliate-receipts'
import { rememberReferral } from '@/lib/money/affiliate-activation'
import { setAffiliateClass, recordAttestation } from '@/lib/money/affiliate-class'
import { recordCreatorMeter } from '@/lib/money/creator-meter'
import { readLeaderboard, setShownOnLeaderboard } from '@/lib/money/affiliate-leaderboard'

/** The affiliate engine wiring on a real Postgres. Every name here is made up. */

const staff = { personId: 'staff-1', staff: true }
const D = (iso: string) => new Date(`${iso}T00:00:00Z`)
const NOW = D('2027-03-10')
const tenant = (slug: string) => prisma.company.create({ data: { name: `Tenant ${slug}`, slug, kind: 'CLIENT' } })
const pay = (t: string, start: string, end: string) => markSubscriptionPaid({ tenantCompanyId: t, periodStart: D(start), periodEnd: D(end), contractorCents: 10000, platformFeeCents: 0, paidAt: D('2027-03-01'), reason: 'Bank file matched' }, staff, NOW)

describe('affiliate engine wiring on a real database', () => {
  let recruiter: string, recruiterCode: string, recruiterPerson: string
  let creator: string, candidate: string, noYes: string

  beforeAll(async () => {
    await resetDatabase()
    recruiterPerson = (await prisma.person.create({ data: { name: 'Rae Recruit', primaryEmail: 'rae@recruit.example' } })).id
    const r = await createAffiliate({ kind: 'PERSON', name: 'Rae Recruit', contactEmail: 'rae@recruit.example', accountPersonId: recruiterPerson }, staff)
    if (!r.ok) throw new Error(r.says)
    recruiter = r.affiliateId; recruiterCode = r.code
    const c = await createAffiliate({ kind: 'PERSON', name: 'Cal Creator', contactEmail: 'cal@creator.example' }, staff)
    if (!c.ok) throw new Error(c.says)
    creator = c.affiliateId
    candidate = (await prisma.person.create({ data: { name: 'Mina Candidate', primaryEmail: 'mina@candidate.example', updatesYesAt: D('2027-01-01') } })).id
    await prisma.resume.create({ data: { personId: candidate, label: 'Data engineering', fileName: 'cv.pdf', contentType: 'application/pdf', sizeBytes: 10 } })
    noYes = (await prisma.person.create({ data: { name: 'Noor Quiet', primaryEmail: 'noor@quiet.example' } })).id
  })

  it('sign-up keeps the door a firm arrived by beside its referral code', async () => {
    const t = await tenant('t-door')
    expect(await rememberReferral(t.id, recruiterCode, prisma, 'storefront')).toEqual({ ok: true, kept: true })
    const row = await prisma.company.findUniqueOrThrow({ where: { id: t.id } })
    expect(row.arrivalDoor).toBe('STOREFRONT')
    expect(row.referredByCode).toBe(recruiterCode)
  })

  it('an unknown door is not kept', async () => {
    const t = await tenant('t-nodoor')
    await rememberReferral(t.id, null, prisma, 'side-gate')
    expect((await prisma.company.findUniqueOrThrow({ where: { id: t.id } })).arrivalDoor).toBeNull()
  })

  it('only Etyme staff set an affiliate’s class', async () => {
    expect((await setAffiliateClass(recruiter, 'RECRUITER', { personId: 'x', staff: false })).ok).toBe(false)
    expect((await setAffiliateClass(recruiter, 'RECRUITER', staff)).ok).toBe(true)
  })

  it('a recruiter with no attestation earns nothing on a paid receipt, and says why', async () => {
    const t = (await tenant('t-rec1')).id
    await activateTenant({ tenantCompanyId: t, code: recruiterCode, activatedAt: D('2026-12-15') }, staff)
    const p = await pay(t, '2027-02-14', '2027-03-14')
    expect(p).toMatchObject({ ok: true, commissionCents: null })
    if (p.ok) expect(p.commissionNote).toMatch(/employment agreement/)
    expect(await prisma.affiliateCommissionEntry.count({ where: { tenantCompanyId: t } })).toBe(0)
  })

  it('nobody attests for a recruiter but the recruiter, signed in as itself', async () => {
    expect((await recordAttestation({ affiliateId: recruiter, personId: 'staff-1', agreed: true })).ok).toBe(false)
    expect((await recordAttestation({ affiliateId: recruiter, personId: recruiterPerson, agreed: false })).ok).toBe(false)
  })

  it('a recruiter that attested earns 40% on the next paid receipt, and attesting twice writes one row', async () => {
    const a = await recordAttestation({ affiliateId: recruiter, personId: recruiterPerson, agreed: true, now: D('2027-03-02') })
    expect(a).toMatchObject({ ok: true, already: false })
    expect(await recordAttestation({ affiliateId: recruiter, personId: recruiterPerson, agreed: true })).toMatchObject({ ok: true, already: true })
    expect(await prisma.affiliateAttestation.count({ where: { affiliateId: recruiter } })).toBe(1)
    const t = (await tenant('t-rec2')).id
    await activateTenant({ tenantCompanyId: t, code: recruiterCode, activatedAt: D('2026-12-15') }, staff)
    expect(await pay(t, '2027-02-14', '2027-03-14')).toMatchObject({ ok: true, commissionCents: 4000 })
  })

  it('a firm affiliate cannot record a resume meter, only a talent referral', async () => {
    const r = await recordCreatorMeter({ affiliateId: recruiter, meter: 'QUALIFIED_RESUME', personId: candidate, sourceKey: 'r:1', occurredAt: D('2027-03-01') }, NOW)
    expect(r.ok).toBe(false)
    const t = await recordCreatorMeter({ affiliateId: recruiter, meter: 'QUALIFIED_CANDIDATE', personId: candidate, sourceKey: 'tr:1', occurredAt: D('2027-03-01') }, NOW)
    expect(t).toMatchObject({ ok: true, paid: false })
  })

  it('a creator’s resume is recorded only for a person with her own yes and a resume, and pays nothing', async () => {
    await setAffiliateClass(creator, 'CREATOR', staff)
    expect((await recordCreatorMeter({ affiliateId: creator, meter: 'QUALIFIED_RESUME', personId: noYes, sourceKey: 'c:0', occurredAt: D('2027-03-01') }, NOW)).ok).toBe(false)
    const r = await recordCreatorMeter({ affiliateId: creator, meter: 'QUALIFIED_RESUME', personId: candidate, sourceKey: 'c:1', occurredAt: D('2027-03-01') }, NOW)
    expect(r).toMatchObject({ ok: true, already: false, paid: false })
    expect(await recordCreatorMeter({ affiliateId: creator, meter: 'QUALIFIED_RESUME', personId: candidate, sourceKey: 'c:1', occurredAt: D('2027-03-01') }, NOW)).toMatchObject({ ok: true, already: true })
    expect(await prisma.affiliateCommissionEntry.count({ where: { affiliateId: creator } })).toBe(0)
  })

  it('a start is recorded for a creator only when that creator brought the person in', async () => {
    expect((await recordCreatorMeter({ affiliateId: creator, meter: 'PLACED', personId: noYes, sourceKey: 'p:0', occurredAt: D('2027-03-05') }, NOW)).ok).toBe(false)
    expect(await recordCreatorMeter({ affiliateId: creator, meter: 'PLACED', personId: candidate, sourceKey: 'p:1', occurredAt: D('2027-03-05') }, NOW)).toMatchObject({ ok: true, paid: false })
  })

  it('a meter fact cannot be changed or deleted once written', async () => {
    await expect(prisma.creatorMeterEvent.deleteMany({ where: { affiliateId: creator } })).rejects.toThrow()
  })

  it('the leaderboard counts activations, tenants still paying and resumes, and names only those who said yes', async () => {
    const board = await readLeaderboard({ now: NOW })
    const rec = board.find((r) => r.activations === 2)!
    expect(rec).toMatchObject({ name: 'An affiliate', retained: 2, resumesLanded: 0 })
    const cre = board.find((r) => r.resumesLanded === 1)!
    expect(cre).toMatchObject({ name: 'An affiliate', activations: 0 })
    await setShownOnLeaderboard(recruiterPerson, true)
    expect((await readLeaderboard({ now: NOW })).find((r) => r.activations === 2)!.name).toBe('Rae Recruit')
  })

  it('a tenant fully refunded drops off the still-paying count', async () => {
    const t = (await prisma.company.findUniqueOrThrow({ where: { slug: 't-rec1' } })).id
    const receipt = await prisma.subscriptionReceipt.findFirstOrThrow({ where: { tenantCompanyId: t } })
    await markReversal({ receiptId: receipt.id, kind: 'REFUND', contractorCents: 10000, platformFeeCents: 0, reason: 'Refunded in full', reversedAt: D('2027-03-05') }, staff, NOW)
    expect((await readLeaderboard({ now: NOW, readerPersonId: recruiterPerson })).find((r) => r.mine)!).toMatchObject({ activations: 2, retained: 1 })
  })
})
