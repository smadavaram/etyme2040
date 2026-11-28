/**
 * The affiliate leaderboard, read from the ledger (2026-11-28).
 *
 * Three counts per affiliate: tenants activated through it, tenants still
 * paying (a receipt not fully reversed whose period runs to today or
 * later), and qualified, consented resumes it brought in. No amount is on
 * it. An affiliate is shown by name only on its own yes; every other row
 * reads "An affiliate". The reader's own row is marked as its own.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma as defaultDb } from '@/lib/db'
import { effectiveAffiliate } from './affiliate-registry'

type Db = PrismaClient | Prisma.TransactionClient

export interface LeaderRow { name: string; mine: boolean; activations: number; retained: number; resumesLanded: number }

/** Pure: biggest first by activations, then tenants still paying, then resumes. */
export function rank(rows: LeaderRow[]): LeaderRow[] {
  return [...rows].sort((a, b) => b.activations - a.activations || b.retained - a.retained || b.resumesLanded - a.resumesLanded)
}

/** Pure: is a receipt still standing (more held than reversed) and does its period reach `now`. */
export function stillPaying(r: { periodEnd: Date; heldCents: number; reversedCents: number }, now: Date): boolean {
  return r.heldCents > r.reversedCents && r.periodEnd.getTime() >= now.getTime()
}

export async function readLeaderboard(i: { readerPersonId?: string | null; now?: Date } = {}, db: Db = defaultDb): Promise<LeaderRow[]> {
  const now = i.now ?? new Date()
  const affiliates = await db.affiliate.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, showOnLeaderboard: true, accountPersonId: true } })
  const tenantsOf = new Map<string, string[]>()
  for (const att of await db.affiliateAttribution.findMany({ select: { tenantCompanyId: true } })) {
    const eff = await effectiveAffiliate(att.tenantCompanyId, db)
    if (!eff?.affiliateId) continue
    tenantsOf.set(eff.affiliateId, [...(tenantsOf.get(eff.affiliateId) ?? []), att.tenantCompanyId])
  }
  const rows: LeaderRow[] = []
  for (const a of affiliates) {
    const tenants = tenantsOf.get(a.id) ?? []
    let retained = 0
    for (const t of tenants) {
      const receipts = await db.subscriptionReceipt.findMany({ where: { tenantCompanyId: t }, select: { id: true, periodEnd: true, contractorCents: true, platformFeeCents: true } })
      let paying = false
      for (const r of receipts) {
        const rev = await db.subscriptionReceiptReversal.findMany({ where: { receiptId: r.id }, select: { contractorCents: true, platformFeeCents: true } })
        const reversed = rev.reduce((s, x) => s + x.contractorCents + x.platformFeeCents, 0)
        if (stillPaying({ periodEnd: r.periodEnd, heldCents: r.contractorCents + r.platformFeeCents, reversedCents: reversed }, now)) { paying = true; break }
      }
      if (paying) retained++
    }
    const resumesLanded = await db.creatorMeterEvent.count({ where: { affiliateId: a.id, meter: 'QUALIFIED_RESUME' } })
    const mine = !!i.readerPersonId && a.accountPersonId === i.readerPersonId
    rows.push({ name: a.showOnLeaderboard || mine ? a.name : 'An affiliate', mine, activations: tenants.length, retained, resumesLanded })
  }
  return rank(rows)
}

/** The affiliate's own yes, or no, to being named on the leaderboard. */
export async function setShownOnLeaderboard(personId: string, show: boolean, db: PrismaClient = defaultDb): Promise<{ ok: true } | { ok: false; says: string }> {
  const a = await db.affiliate.findFirst({ where: { accountPersonId: personId }, select: { id: true } })
  if (!a) return { ok: false, says: 'You are not an affiliate, so there is nothing to show.' }
  await db.affiliate.update({ where: { id: a.id }, data: { showOnLeaderboard: show } })
  return { ok: true }
}
