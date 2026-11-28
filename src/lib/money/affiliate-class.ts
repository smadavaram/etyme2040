/**
 * Affiliate classes and the recruiter's attestation (2026-11-28).
 *
 * FIRM, RECRUITER and CREATOR earn on the same terms (40% then 20% of
 * subscriptions a tenant paid). A RECRUITER earns nothing until it has
 * attested, on its own record, that a referral breaches no employment
 * agreement it holds. The attestation is a row nobody may change; a new
 * version of the words is a new row. Staff set the class; only the
 * affiliate's own signed-in person attests.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultDb } from '@/lib/db'
import { meterActs } from './affiliate-metering'
import type { Actor, AffiliateAct, Refused } from './affiliate-registry'

type Db = PrismaClient | Prisma.TransactionClient
export type AffiliateClassName = 'FIRM' | 'RECRUITER' | 'CREATOR'

export const ATTESTATION_KIND = 'NO_EMPLOYMENT_BREACH'
export const ATTESTATION_TERMS_VERSION = '2026-11-28'
export const ATTESTATION_TEXT = 'I confirm that referring firms to Etyme breaches no employment agreement I hold.'

/** Pure: may this affiliate earn on a paid receipt, by its class alone. */
export function classEarns(i: { affiliateClass: AffiliateClassName; attested: boolean; name: string }): { ok: true } | { ok: false; says: string } {
  if (i.affiliateClass === 'RECRUITER' && !i.attested) {
    return { ok: false, says: `${i.name} is a recruiter and has not confirmed that referring breaches no employment agreement, so this receipt earns nothing.` }
  }
  return { ok: true }
}

export async function hasAttestation(affiliateId: string, db: Db = defaultDb): Promise<boolean> {
  return !!(await db.affiliateAttestation.findFirst({ where: { affiliateId, kind: ATTESTATION_KIND, termsVersion: ATTESTATION_TERMS_VERSION }, select: { id: true } }))
}

export async function setAffiliateClass(
  affiliateId: string, affiliateClass: AffiliateClassName, actor: Actor, db: PrismaClient = defaultDb,
): Promise<{ ok: true; acts: AffiliateAct[] } | Refused> {
  if (!actor.staff) return { ok: false, says: 'Only Etyme staff keep the affiliate registry and its ledger.' }
  if (!['FIRM', 'RECRUITER', 'CREATOR'].includes(affiliateClass)) return { ok: false, says: 'An affiliate is a firm, a recruiter or a creator.' }
  const a = await db.affiliate.findUnique({ where: { id: affiliateId }, select: { id: true, affiliateClass: true } })
  if (!a) return { ok: false, says: 'There is no such affiliate.' }
  if (a.affiliateClass === affiliateClass) return { ok: false, says: 'The affiliate is already in that class.' }
  await db.affiliate.update({ where: { id: affiliateId }, data: { affiliateClass } })
  return { ok: true, acts: await meterActs(db, [{ action: 'CLASS_SET', recordType: 'Affiliate', recordId: affiliateId, summary: `An affiliate was moved from ${a.affiliateClass.toLowerCase()} to ${affiliateClass.toLowerCase()}.`, personId: actor.personId, heldAs: 'Etyme staff' }]) }
}

/** The recruiter's own yes to the attestation words. Nobody attests for another person. */
export async function recordAttestation(
  i: { affiliateId: string; personId: string; agreed: boolean; now?: Date },
  db: PrismaClient = defaultDb,
): Promise<{ ok: true; attestationId: string; already: boolean; acts: AffiliateAct[] } | Refused> {
  const a = await db.affiliate.findUnique({ where: { id: i.affiliateId }, select: { id: true, affiliateClass: true, accountPersonId: true } })
  if (!a) return { ok: false, says: 'There is no such affiliate.' }
  if (!a.accountPersonId || a.accountPersonId !== i.personId) return { ok: false, says: 'Only the affiliate, signed in as itself, confirms this. Nobody confirms it for another person.' }
  if (a.affiliateClass !== 'RECRUITER') return { ok: false, says: 'Only a recruiter affiliate confirms this.' }
  if (i.agreed !== true) return { ok: false, says: `Tick the box to confirm: ${ATTESTATION_TEXT}` }
  const prior = await db.affiliateAttestation.findFirst({ where: { affiliateId: a.id, kind: ATTESTATION_KIND, termsVersion: ATTESTATION_TERMS_VERSION }, select: { id: true } })
  if (prior) return { ok: true, attestationId: prior.id, already: true, acts: [] }
  const row = await db.affiliateAttestation.create({ data: { affiliateId: a.id, kind: ATTESTATION_KIND, termsVersion: ATTESTATION_TERMS_VERSION, attestedAt: i.now ?? new Date(), attestedByPersonId: i.personId } })
  return { ok: true, attestationId: row.id, already: false, acts: await meterActs(db, [{ action: 'ATTESTED', recordType: 'AffiliateAttestation', recordId: row.id, summary: 'A recruiter affiliate confirmed that referring breaches no employment agreement.', personId: i.personId, heldAs: 'Affiliate' }]) }
}
