/**
 * Track B creator meters and the talent-referral basis, recorded as data
 * and paid on nothing (2026-11-28).
 *
 * Neither the creator pay meter nor the talent-referral basis is ruled. So
 * both candidate meters are kept as facts: a qualified, consented resume a
 * creator brought in, and the same person later placed. A talent referral
 * (a qualified, consented candidate) is kept the same way for any class.
 * No row carries an amount or a rate, the payout file never reads this
 * table, and nothing here reads a rate, a line or a margin. This file sits
 * outside the affiliate-* files on purpose: they may not name a placement.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultDb } from '@/lib/db'
import { saidYesToUpdates } from '@/lib/updates-consent'

type Db = PrismaClient | Prisma.TransactionClient

export const CREATOR_METERS = ['QUALIFIED_RESUME', 'PLACED', 'QUALIFIED_CANDIDATE'] as const
export type CreatorMeter = (typeof CREATOR_METERS)[number]

/** Nothing is paid on a meter until the owner rules its basis. */
export const CREATOR_METER_PAYS = false as const
export const PAYS_NOTHING_SAYS = 'Recorded as a fact. Nothing is paid on it: the basis is not ruled yet.'

export type MeterResult =
  | { ok: true; eventId: string; already: boolean; paid: false; says: string }
  | { ok: false; says: string }

/** Pure: which class may record which meter. */
export function meterAllowed(meter: CreatorMeter, affiliateClass: string): boolean {
  if (meter === 'QUALIFIED_CANDIDATE') return true
  return affiliateClass === 'CREATOR'
}

/** Pure: a person qualifies when she has her own standing yes and a resume on file. */
export function qualifies(p: { updatesYesAt: Date | null; updatesRevokedAt: Date | null; resumeCount: number }): boolean {
  return saidYesToUpdates(p) && p.resumeCount > 0
}

export async function recordCreatorMeter(
  i: { affiliateId: string; meter: CreatorMeter; personId: string; sourceKey: string; occurredAt: Date; evidence?: Prisma.InputJsonValue },
  now: Date = new Date(),
  db: Db = defaultDb,
): Promise<MeterResult> {
  if (!(CREATOR_METERS as readonly string[]).includes(i.meter)) return { ok: false, says: 'That is not a meter Etyme keeps.' }
  if (!i.sourceKey.trim()) return { ok: false, says: 'A meter fact needs the record it came from.' }
  if (i.occurredAt.getTime() > now.getTime()) return { ok: false, says: 'A date that has not happened yet is not recorded.' }
  const prior = await db.creatorMeterEvent.findUnique({ where: { sourceKey: i.sourceKey }, select: { id: true } })
  if (prior) return { ok: true, eventId: prior.id, already: true, paid: false, says: PAYS_NOTHING_SAYS }
  const a = await db.affiliate.findUnique({ where: { id: i.affiliateId }, select: { status: true, affiliateClass: true } })
  if (!a) return { ok: false, says: 'There is no such affiliate.' }
  if (a.status !== 'ACTIVE') return { ok: false, says: 'That affiliate is not active, so nothing is recorded for it.' }
  if (!meterAllowed(i.meter, a.affiliateClass)) return { ok: false, says: 'Only a creator affiliate records resumes and starts. Anyone may record a talent referral.' }

  if (i.meter === 'PLACED') {
    const brought = await db.creatorMeterEvent.findFirst({ where: { affiliateId: i.affiliateId, personId: i.personId, meter: 'QUALIFIED_RESUME' }, select: { id: true } })
    if (!brought) return { ok: false, says: 'This person did not come in through this creator, so the start is not recorded for it.' }
  } else {
    const p = await db.person.findUnique({ where: { id: i.personId }, select: { updatesYesAt: true, updatesRevokedAt: true, resumes: { where: { deletedAt: null }, select: { id: true }, take: 1 } } })
    if (!p) return { ok: false, says: 'There is no such person.' }
    if (!qualifies({ updatesYesAt: p.updatesYesAt, updatesRevokedAt: p.updatesRevokedAt, resumeCount: p.resumes.length })) {
      return { ok: false, says: 'She has not said yes to updates, or has no resume on file, so she does not count yet.' }
    }
  }
  const row = await db.creatorMeterEvent.create({ data: { affiliateId: i.affiliateId, meter: i.meter, personId: i.personId, sourceKey: i.sourceKey.trim(), evidence: i.evidence ?? undefined, occurredAt: i.occurredAt } })
  return { ok: true, eventId: row.id, already: false, paid: false, says: PAYS_NOTHING_SAYS }
}
