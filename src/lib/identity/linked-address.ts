import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { mailedUrl } from '@/lib/app-url'
import { sendEmailNow } from '@/lib/notify/send-now'
import { recordIdentityEvent } from '@/lib/identity/ledger'

/**
 * A second sign-in address on one record (Pax, 2026-11-28).
 *
 * A Microsoft work address that differs from a Gmail must never make a
 * second person. So a person who is signed in asks to link the new
 * address, a one-time link goes to that address, and following it is their
 * yes. Nothing is ever merged by how two addresses look, and nothing is
 * linked by anybody but the person: the route that asks reads the person
 * from the session, never from the request.
 *
 * Once linked, a sign-in the provider vouched for on the second address is
 * the same person: `primaryFor` hands the sign-in callback the primary
 * address, and every read after that is unchanged.
 */

const HOUR_MS = 3_600_000
const hash = (t: string) => createHash('sha256').update(t).digest('hex')
const clean = (e: unknown) => String(e ?? '').trim().toLowerCase()
const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

export type LinkAnswer = { ok: true; says: string } | { ok: false; says: string; status: number }

/** The primary address of the person this address is linked to, or null. Confirmed links only. */
export async function primaryFor(address: string): Promise<string | null> {
  const row = await prisma.linkedSignInAddress.findUnique({
    where: { email: clean(address) },
    select: { verifiedAt: true, person: { select: { primaryEmail: true } } },
  })
  return row?.verifiedAt ? row.person.primaryEmail : null
}

/** The person asks, from their own session, to link a second address. Sends the link to it. */
export async function requestLink(personId: string, newAddress: unknown, now: Date = new Date()): Promise<LinkAnswer> {
  const email = clean(newAddress)
  if (!looksLikeEmail(email)) return { ok: false, status: 422, says: 'That does not look like an email address. Check it and try again.' }
  const me = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, primaryEmail: true } })
  if (!me) return { ok: false, status: 401, says: 'Sign in again to link an address.' }
  if (email === me.primaryEmail) return { ok: false, status: 409, says: 'That is already the address you sign in with.' }
  // An address that is already somebody's own record is never folded in: two records
  // are joined by a person and a company, never by this door.
  const other = await prisma.person.findUnique({ where: { primaryEmail: email }, select: { id: true } })
  if (other) return { ok: false, status: 409, says: 'That address already has its own Etyme account. Ask Etyme support to join two accounts; this page does not.' }
  const taken = await prisma.linkedSignInAddress.findUnique({ where: { email }, select: { personId: true, verifiedAt: true } })
  if (taken?.verifiedAt && taken.personId !== personId) return { ok: false, status: 409, says: 'That address is already linked to another account.' }

  const token = randomBytes(32).toString('base64url')
  await prisma.linkedSignInAddress.upsert({
    where: { email },
    update: { personId, tokenHash: hash(token), expiresAt: new Date(now.getTime() + HOUR_MS), verifiedAt: null },
    create: { personId, email, tokenHash: hash(token), expiresAt: new Date(now.getTime() + HOUR_MS) },
  })
  const sent = await sendEmailNow({
    to: email,
    subject: 'Confirm this address for your Etyme sign-in',
    body: ['Someone signed in as you on Etyme asked to add this address as another way to sign in.', 'If that was you, open this link within an hour. If not, ignore this email and nothing changes.', '', `${mailedUrl()}/link-address/${token}`].join('\n'),
    personId, companyId: null,
    about: { template: 'account-mail', recordType: 'Person', recordId: personId, actorPersonId: personId },
  })
  if (sent.state !== 'SENT') {
    await prisma.linkedSignInAddress.deleteMany({ where: { email, verifiedAt: null } })
    return { ok: false, status: 503, says: 'The confirmation email could not be sent right now, so nothing was linked. Try again later.' }
  }
  return { ok: true, says: `We sent a link to ${email}. Open it there to finish. It works for an hour.` }
}

/** The one-time link, followed from the new address: the link is made, and the ledger row written. */
export async function confirmLink(token: unknown, now: Date = new Date()): Promise<LinkAnswer> {
  const t = String(token ?? '')
  if (!t) return { ok: false, status: 422, says: 'This link is not complete. Ask for a new one from your account.' }
  const row = await prisma.linkedSignInAddress.findFirst({ where: { tokenHash: hash(t) }, select: { id: true, personId: true, email: true, expiresAt: true, verifiedAt: true } })
  if (!row || row.verifiedAt || !row.expiresAt || row.expiresAt.getTime() < now.getTime()) {
    return { ok: false, status: 410, says: 'This link was already used or has run out. Ask for a new one from your account.' }
  }
  await prisma.$transaction(async (tx) => {
    await tx.linkedSignInAddress.update({ where: { id: row.id }, data: { verifiedAt: now, tokenHash: null, expiresAt: null } })
    await recordIdentityEvent({
      event: 'SIGN_IN_ADDRESS_LINKED', companyId: null, actorPersonId: row.personId, subject: { personId: row.personId },
      policy: 'OPEN', surface: 'WEB', says: `Linked ${row.email} as a second sign-in address on their own record.`,
    }, tx)
  })
  return { ok: true, says: `${row.email} now signs in to your Etyme record.` }
}
