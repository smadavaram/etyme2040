/**
 * An affiliate's own link, and the door a firm arrived by (2026-11-28).
 *
 * The link carries the affiliate's code (`?ref=`) and the door it points
 * at (`?door=`). Sign-up keeps both on the company until its clock starts
 * (lib/money/affiliate-activation). A door is a label, never money: it
 * says where a firm came in, and nothing is paid on it.
 */
export const AFFILIATE_DOORS = ['HOME', 'STOREFRONT', 'SIGNUP', 'COURSE'] as const
export type AffiliateDoor = (typeof AFFILIATE_DOORS)[number]

const CODE_SHAPE = /^[a-z0-9_-]{2,64}$/
const DOOR_PATH: Record<AffiliateDoor, string> = { HOME: '/', STOREFRONT: '/site', SIGNUP: '/signup', COURSE: '/learnai' }

/** Pure: a known door, read from what a link carried, or null. */
export function doorOf(raw: unknown): AffiliateDoor | null {
  if (typeof raw !== 'string') return null
  const d = raw.trim().toUpperCase()
  return (AFFILIATE_DOORS as readonly string[]).includes(d) ? (d as AffiliateDoor) : null
}

/**
 * Pure: the link an affiliate shares. `slug` names a tenant's storefront
 * where the door is STOREFRONT. Refuses a malformed code or a storefront
 * with no slug, in a sentence.
 */
export function affiliateLink(
  i: { base: string; code: string; door: AffiliateDoor; slug?: string | null },
): { ok: true; url: string } | { ok: false; says: string } {
  const code = i.code.trim().toLowerCase()
  if (!CODE_SHAPE.test(code)) return { ok: false, says: 'That referral code is not in the shape the registry makes.' }
  let path = DOOR_PATH[i.door]
  if (i.door === 'STOREFRONT') {
    const slug = (i.slug ?? '').trim().toLowerCase()
    if (!/^[a-z0-9-]{1,64}$/.test(slug)) return { ok: false, says: 'A storefront link needs the firm’s storefront address.' }
    path = `/site/${slug}`
  }
  let url: URL
  try { url = new URL(path, i.base) } catch { return { ok: false, says: 'The site address is not a web address.' } }
  url.searchParams.set('ref', code)
  url.searchParams.set('door', i.door.toLowerCase())
  return { ok: true, url: url.toString() }
}
