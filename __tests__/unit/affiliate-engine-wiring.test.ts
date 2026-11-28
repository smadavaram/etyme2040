import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { affiliateLink, doorOf } from '@/lib/money/affiliate-links'
import { classEarns } from '@/lib/money/affiliate-class'
import { meterAllowed, qualifies, CREATOR_METER_PAYS } from '@/lib/money/creator-meter'
import { rank, stillPaying } from '@/lib/money/affiliate-leaderboard'

const src = (f: string) => readFileSync(join(process.cwd(), 'src/lib/money', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('an affiliate link carries its code and its door', () => {
  it('an affiliate link to the home page carries the code and the door', () => {
    const r = affiliateLink({ base: 'https://example.invalid', code: 'Acme-ab2cd', door: 'HOME' })
    expect(r).toEqual({ ok: true, url: 'https://example.invalid/?ref=acme-ab2cd&door=home' })
  })
  it('a storefront link names the firm’s own storefront', () => {
    const r = affiliateLink({ base: 'https://example.invalid', code: 'ref-x2', door: 'STOREFRONT', slug: 'tapin' })
    expect(r.ok && r.url).toBe('https://example.invalid/site/tapin?ref=ref-x2&door=storefront')
  })
  it('a storefront link with no storefront address is refused in a sentence', () => {
    expect(affiliateLink({ base: 'https://example.invalid', code: 'ref-x2', door: 'STOREFRONT' }).ok).toBe(false)
  })
  it('a code not in the registry’s shape makes no link', () => {
    expect(affiliateLink({ base: 'https://example.invalid', code: 'bad code!', door: 'HOME' }).ok).toBe(false)
  })
  it('an unknown door is read as no door', () => {
    expect(doorOf('storefront')).toBe('STOREFRONT')
    expect(doorOf('the-back-door')).toBeNull()
    expect(doorOf(undefined)).toBeNull()
  })
})

describe('a recruiter earns only after its attestation', () => {
  it('a recruiter with no attestation earns nothing, and the reason is said', () => {
    const r = classEarns({ affiliateClass: 'RECRUITER', attested: false, name: 'Rae' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.says).toMatch(/employment agreement/)
  })
  it('a recruiter that attested earns on the same terms as a firm', () => {
    expect(classEarns({ affiliateClass: 'RECRUITER', attested: true, name: 'Rae' }).ok).toBe(true)
  })
  it('a firm or a creator needs no attestation to earn', () => {
    expect(classEarns({ affiliateClass: 'FIRM', attested: false, name: 'F' }).ok).toBe(true)
    expect(classEarns({ affiliateClass: 'CREATOR', attested: false, name: 'C' }).ok).toBe(true)
  })
})

describe('creator meters are data and pay nothing', () => {
  it('nothing is paid on a creator meter until its basis is ruled', () => {
    expect(CREATOR_METER_PAYS).toBe(false)
  })
  it('only a creator records resumes and starts, and any affiliate records a talent referral', () => {
    expect(meterAllowed('QUALIFIED_RESUME', 'FIRM')).toBe(false)
    expect(meterAllowed('PLACED', 'RECRUITER')).toBe(false)
    expect(meterAllowed('QUALIFIED_RESUME', 'CREATOR')).toBe(true)
    expect(meterAllowed('QUALIFIED_CANDIDATE', 'FIRM')).toBe(true)
  })
  it('a person counts only with her own standing yes and a resume on file', () => {
    const yes = new Date('2026-11-01')
    expect(qualifies({ updatesYesAt: yes, updatesRevokedAt: null, resumeCount: 1 })).toBe(true)
    expect(qualifies({ updatesYesAt: yes, updatesRevokedAt: null, resumeCount: 0 })).toBe(false)
    expect(qualifies({ updatesYesAt: yes, updatesRevokedAt: new Date('2026-11-02'), resumeCount: 1 })).toBe(false)
    expect(qualifies({ updatesYesAt: null, updatesRevokedAt: null, resumeCount: 1 })).toBe(false)
  })
  it('the creator meter table has no amount and the payout file never reads it', () => {
    expect(src('creator-meter.ts')).not.toMatch(/Cents|rateBp/)
    expect(src('affiliate-payout.ts')).not.toMatch(/creatorMeter/i)
    expect(src('affiliate-commission.ts')).not.toMatch(/creatorMeter/i)
  })
})

describe('the leaderboard is counts from the ledger', () => {
  it('the leaderboard ranks by activations, then tenants still paying, then resumes', () => {
    const r = rank([
      { name: 'A', mine: false, activations: 1, retained: 1, resumesLanded: 9 },
      { name: 'B', mine: false, activations: 2, retained: 0, resumesLanded: 0 },
      { name: 'C', mine: false, activations: 1, retained: 1, resumesLanded: 10 },
    ])
    expect(r.map((x) => x.name)).toEqual(['B', 'C', 'A'])
  })
  it('a tenant fully refunded, or whose paid period has ended, is not counted as still paying', () => {
    const now = new Date('2027-01-15')
    expect(stillPaying({ periodEnd: new Date('2027-01-31'), heldCents: 100, reversedCents: 0 }, now)).toBe(true)
    expect(stillPaying({ periodEnd: new Date('2027-01-31'), heldCents: 100, reversedCents: 100 }, now)).toBe(false)
    expect(stillPaying({ periodEnd: new Date('2026-12-31'), heldCents: 100, reversedCents: 0 }, now)).toBe(false)
  })
  it('the leaderboard carries no amount', () => {
    expect(src('affiliate-leaderboard.ts')).not.toMatch(/commissionCents|basisCents|netCents/)
  })
})
