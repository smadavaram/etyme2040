/**
 * Microsoft and LinkedIn sign-in, the tenant's own door, the client
 * directory rule and the second sign-in address (Pax, 2026-11-28).
 *
 * Every company here is invented and every address is on a reserved
 * domain. The provider's answer is the profile the provider would send;
 * no real Microsoft or LinkedIn app is called, and none has signed
 * anybody in yet: the keys are the owner's.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const db = vi.hoisted(() => ({
  companySignInPolicy: { findMany: vi.fn(async () => []), findUnique: vi.fn() },
  identityProvider: { findMany: vi.fn(async () => []) },
  person: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
  context: { findFirst: vi.fn(), findMany: vi.fn(async () => []) },
  accessLog: { createMany: vi.fn(async (_a: any) => ({ count: 1 })), create: vi.fn(async (_a: any) => ({})), findFirst: vi.fn() },
  company: { findFirst: vi.fn(), findMany: vi.fn(async () => []), findUnique: vi.fn() },
  linkedSignInAddress: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(async () => ({})), update: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({ count: 1 })) },
  credential: { upsert: vi.fn(async () => ({})) },
  incident: { findFirst: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}))
db.$transaction.mockImplementation(async (fn: any) => fn(db))
vi.mock('@/lib/db', () => ({ prisma: db }))

const sent = vi.hoisted(() => ({ list: [] as { to: string; body: string }[], state: 'SENT' as string }))
vi.mock('@/lib/notify/send-now', () => ({
  sendEmailNow: vi.fn(async (m: any) => { sent.list.push({ to: m.to, body: m.body }); return { state: sent.state, note: null } }),
}))

const session = vi.hoisted(() => ({ value: null as any }))
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn(async () => session.value) }))
vi.mock('@/lib/permission-grants', () => ({
  seatPermissions: vi.fn(async (_s: unknown, role: string[]) => ({ permissions: role, granted: [] })),
}))

import { stackRefusal, clientSetupRefusal, decideDoor, effectiveMode, type CompanyPolicy } from '@/lib/identity/policy'

const NORTHWIND: CompanyPolicy = { companyId: 'co-nw', companyName: 'Northwind Group', mode: null, issuers: [], stack: 'MICROSOFT', kind: 'VENDOR' }
const HARBOR: CompanyPolicy = { companyId: 'co-hb', companyName: 'Harbor Staffing', mode: null, issuers: [], stack: 'GOOGLE', kind: 'VENDOR' }
const CLIENT_OFF: CompanyPolicy = { companyId: 'co-cl', companyName: 'Corvane Packaging', mode: null, issuers: [], kind: 'CLIENT' }
const CLIENT_ON: CompanyPolicy = { ...CLIENT_OFF, issuers: ['https://login.microsoftonline.com/t1/v2.0'] }

beforeEach(() => { vi.clearAllMocks(); sent.list = []; sent.state = 'SENT'; session.value = null; db.$transaction.mockImplementation(async (fn: any) => fn(db)) })
afterEach(() => { delete process.env.CLIENT_SSO_ENFORCED })

describe('a tenant on the Microsoft stack signs in with Microsoft, and a Google tenant keeps Google', () => {
  it('a Microsoft-stack tenant refuses Google, the email link and a password, and says to use Microsoft', () => {
    for (const door of ['GOOGLE_SOCIAL', 'EMAIL_LINK', 'PASSWORD', 'VERIFY_TOKEN'] as const) {
      expect(stackRefusal(door, NORTHWIND), door).toMatch(/signs in with Microsoft\. Use Continue with Microsoft/)
    }
    expect(stackRefusal('MICROSOFT_SOCIAL', NORTHWIND)).toBeNull()
    expect(stackRefusal('DIRECTORY', NORTHWIND)).toBeNull()
  })

  it('a Google-stack tenant refuses Microsoft and keeps Google', () => {
    expect(stackRefusal('MICROSOFT_SOCIAL', HARBOR)).toMatch(/signs in with Google/)
    expect(stackRefusal('GOOGLE_SOCIAL', HARBOR)).toBeNull()
  })

  it('a tenant that names no door refuses nothing, and LinkedIn is never judged by the stack', () => {
    expect(stackRefusal('GOOGLE_SOCIAL', { companyName: 'Anyone', stack: null })).toBeNull()
    expect(stackRefusal('LINKEDIN', NORTHWIND)).toBeNull()
    expect(stackRefusal(null, NORTHWIND)).toBeNull()
  })

  it('an address on a Microsoft-stack tenant’s domain is refused at the Google door and let in at the Microsoft door', () => {
    const q = { email: 'ana@northwind.example', domainCompany: NORTHWIND, publicAddress: false }
    const g = decideDoor({ ...q, door: 'GOOGLE_SOCIAL' })
    expect(g.allowed).toBe(false)
    expect(decideDoor({ ...q, door: 'MICROSOFT_SOCIAL' }).allowed).toBe(true)
  })

  it('the same person’s seat at a company with no stack is not touched by another company’s stack', () => {
    expect(decideDoor({ door: 'GOOGLE_SOCIAL', email: 'ana@gmail.com', domainCompany: null, target: { ...HARBOR, stack: null }, publicAddress: true }).allowed).toBe(true)
  })

  it('a session signed in by the wrong door is refused the seat on its next request, with the row written first', async () => {
    session.value = { user: { email: 'ana@northwind.example', door: 'GOOGLE_SOCIAL', issuer: null } }
    db.person.findUnique.mockResolvedValue({ id: 'p-ana', name: 'Ana', primaryEmail: 'ana@northwind.example', timezone: null })
    const seat = {
      id: 'c1', type: 'EMPLOYEE', companyId: 'co-nw', roleId: 'r', personId: 'p-ana', orgUnitId: null, lastUsedAt: new Date(),
      company: { id: 'co-nw', name: 'Northwind Group', slug: 'nw', kind: 'VENDOR', signInStack: 'MICROSOFT', outsideAccess: 'ALLOWED', accountWalls: false, isDemo: false, signInPolicy: null, identityProviders: [] },
      role: { id: 'r', name: 'Admin', permissions: ['team.manage'] }, orgUnit: null,
    }
    db.context.findFirst.mockResolvedValue(seat); db.context.findMany.mockResolvedValue([seat] as any)
    const { getCallerContext } = await import('@/lib/api-context')
    const refused = await getCallerContext()
    expect(refused.caller).toBeNull()
    expect((await refused.error!.json()).error.code).toBe('WRONG_TENANT_DOOR')
    expect(db.accessLog.createMany.mock.calls.length + db.accessLog.create.mock.calls.length).toBeGreaterThan(0)

    session.value = { user: { email: 'ana@northwind.example', door: 'MICROSOFT_SOCIAL', issuer: null } }
    const ok = await getCallerContext()
    expect(ok.error).toBeNull()
    expect(ok.caller).not.toBeNull()
    expect(ok.caller?.company?.id).toBe('co-nw')
  })
})

describe('a client signs in through its own directory, and the Owner alone may finish setting it up', () => {
  it('nothing changes for a client until the release turns the rule on', () => {
    expect(effectiveMode({ ...CLIENT_ON, mode: 'HYBRID' })).toBe('HYBRID')
    expect(clientSetupRefusal(CLIENT_OFF, false)).toBeNull()
  })

  it('once its directory is on, a client is directory-only whatever mode was chosen before', () => {
    process.env.CLIENT_SSO_ENFORCED = '1'
    expect(effectiveMode(CLIENT_ON)).toBe('SSO_ONLY')
    expect(effectiveMode({ ...CLIENT_ON, mode: 'HYBRID' })).toBe('SSO_ONLY')
    for (const door of ['GOOGLE_SOCIAL', 'MICROSOFT_SOCIAL', 'EMAIL_LINK', 'PASSWORD', 'LINKEDIN'] as const) {
      expect(decideDoor({ door, email: 'jo@corvane.example', domainCompany: CLIENT_ON, publicAddress: false }).allowed, door).toBe(false)
    }
    expect(decideDoor({ door: 'DIRECTORY', issuer: CLIENT_ON.issuers[0], email: 'jo@corvane.example', domainCompany: CLIENT_ON, publicAddress: false }).allowed).toBe(true)
  })

  it('before its directory is on, only the Owner may use the client’s seat, and a colleague is told why', () => {
    process.env.CLIENT_SSO_ENFORCED = '1'
    expect(clientSetupRefusal(CLIENT_OFF, true)).toBeNull()
    expect(clientSetupRefusal(CLIENT_OFF, false)).toMatch(/only its Owner can sign in/)
  })

  it('the setup window closes by itself when the directory is on', () => {
    process.env.CLIENT_SSO_ENFORCED = '1'
    expect(clientSetupRefusal(CLIENT_ON, false)).toBeNull()
  })

  it('the rule never reaches a company that is not a client', () => {
    process.env.CLIENT_SSO_ENFORCED = '1'
    expect(clientSetupRefusal({ ...CLIENT_OFF, kind: 'VENDOR' }, false)).toBeNull()
    expect(effectiveMode({ ...CLIENT_ON, kind: 'VENDOR', mode: 'HYBRID' })).toBe('HYBRID')
  })
})

describe('Microsoft and LinkedIn sign-ins land on the person’s own record', () => {
  const ms = { provider: 'azure-ad', providerAccountId: 'ms-sub-1' }
  async function signIn(provider: string, email: string, profile: Record<string, unknown>) {
    const { authOptions } = await import('@/lib/auth')
    const user: any = { id: 'x', email }
    const r = await authOptions.callbacks!.signIn!({ user, account: { provider, providerAccountId: 'sub-1', type: 'oauth' } as any, profile } as any)
    return { r, user }
  }
  beforeEach(() => {
    db.linkedSignInAddress.findUnique.mockResolvedValue(null)
    db.person.findUnique.mockResolvedValue({ id: 'p-ana', sessionVersion: 0, primaryEmail: 'ana@gmail.com' })
  })

  it('a Microsoft account whose domain Microsoft verified signs in, and one it did not verify is refused', async () => {
    expect((await signIn('azure-ad', 'Ana@Northwind.example', { xms_edov: true })).r).toBe(true)
    expect((await signIn('azure-ad', 'ana@northwind.example', { xms_edov: false })).r).toBe('/login?error=EmailNotVerified')
    void ms
  })

  it('a LinkedIn account with a confirmed email signs in as a candidate, and an unconfirmed one is refused', async () => {
    db.context.findFirst.mockResolvedValue(null)
    expect((await signIn('linkedin', 'sam@gmail.com', { email_verified: true })).r).toBe(true)
    expect((await signIn('linkedin', 'sam@gmail.com', { email_verified: false })).r).toBe('/login?error=EmailNotVerified')
  })

  it('a LinkedIn sign-in by somebody who holds a company seat is sent to the way in that seat uses', async () => {
    db.context.findFirst.mockResolvedValue({ personId: 'p-rec', companyId: 'co-nw', company: { name: 'Northwind Group' } })
    expect((await signIn('linkedin', 'rec@gmail.com', { email_verified: true })).r).toBe('/login?error=LinkedInHasSeat')
  })

  it('a linked second address signs in as the primary record, never as a new person', async () => {
    db.linkedSignInAddress.findUnique.mockResolvedValue({ verifiedAt: new Date(), person: { primaryEmail: 'ana@gmail.com' } })
    const { r, user } = await signIn('azure-ad', 'ana@northwind.example', { xms_edov: true })
    expect(r).toBe(true)
    expect(user.email).toBe('ana@gmail.com')
  })

  it('an address that was asked for but never confirmed is not the same person', async () => {
    db.linkedSignInAddress.findUnique.mockResolvedValue({ verifiedAt: null, person: { primaryEmail: 'ana@gmail.com' } })
    const { user } = await signIn('azure-ad', 'ana@northwind.example', { xms_edov: true })
    expect(user.email).toBe('ana@northwind.example')
  })

  it('Google sign-in is untouched: the same address, the same checks, the same answer', async () => {
    expect((await signIn('google', 'ana@gmail.com', { email_verified: true })).r).toBe(true)
    expect((await signIn('google', 'ana@gmail.com', { email_verified: false })).r).toBe('/login?error=EmailNotVerified')
  })
})

describe('a person links a second sign-in address with their own yes', () => {
  it('asking sends one link to the new address and stores only its hash', async () => {
    db.person.findUnique.mockImplementation(async ({ where }: any) => (where.id ? { id: 'p-ana', primaryEmail: 'ana@gmail.com' } : null))
    db.linkedSignInAddress.findUnique.mockResolvedValue(null)
    const { requestLink } = await import('@/lib/identity/linked-address')
    const a = await requestLink('p-ana', ' Ana@Northwind.example ')
    expect(a.ok).toBe(true)
    expect(sent.list).toHaveLength(1)
    expect(sent.list[0].to).toBe('ana@northwind.example')
    const token = sent.list[0].body.split('/link-address/')[1].trim()
    const stored = (db.linkedSignInAddress.upsert.mock.calls[0] as any)[0].create
    expect(stored.tokenHash).not.toContain(token)
    expect(stored.personId).toBe('p-ana')
  })

  it('an address that already has its own account is never folded in, and nothing is sent', async () => {
    db.person.findUnique.mockImplementation(async ({ where }: any) => (where.id ? { id: 'p-ana', primaryEmail: 'ana@gmail.com' } : { id: 'p-other' }))
    const { requestLink } = await import('@/lib/identity/linked-address')
    const a = await requestLink('p-ana', 'ana2@northwind.example')
    expect(a.ok).toBe(false)
    expect(sent.list).toHaveLength(0)
    expect(db.linkedSignInAddress.upsert).not.toHaveBeenCalled()
  })

  it('an address linked to somebody else is refused', async () => {
    db.person.findUnique.mockImplementation(async ({ where }: any) => (where.id ? { id: 'p-ana', primaryEmail: 'ana@gmail.com' } : null))
    db.linkedSignInAddress.findUnique.mockResolvedValue({ personId: 'p-zed', verifiedAt: new Date() })
    const { requestLink } = await import('@/lib/identity/linked-address')
    expect((await requestLink('p-ana', 'zed@northwind.example')).ok).toBe(false)
  })

  it('where the email cannot leave, nothing is linked and the person is told', async () => {
    sent.state = 'NOT_CONFIGURED'
    db.person.findUnique.mockImplementation(async ({ where }: any) => (where.id ? { id: 'p-ana', primaryEmail: 'ana@gmail.com' } : null))
    db.linkedSignInAddress.findUnique.mockResolvedValue(null)
    const { requestLink } = await import('@/lib/identity/linked-address')
    const a = await requestLink('p-ana', 'ana@northwind.example')
    expect(a.ok).toBe(false)
    expect(db.linkedSignInAddress.deleteMany).toHaveBeenCalled()
  })

  it('following the link confirms it once and writes the ledger row', async () => {
    db.linkedSignInAddress.findFirst.mockResolvedValue({ id: 'l1', personId: 'p-ana', email: 'ana@northwind.example', expiresAt: new Date(Date.now() + 60_000), verifiedAt: null })
    const { confirmLink } = await import('@/lib/identity/linked-address')
    const a = await confirmLink('tok')
    expect(a.ok).toBe(true)
    expect((db.linkedSignInAddress.update.mock.calls[0] as any)[0].data.tokenHash).toBeNull()
    const rows = db.accessLog.createMany.mock.calls.flatMap((c: any) => c[0].data).concat(db.accessLog.create.mock.calls.map((c: any) => c[0].data))
    expect(JSON.stringify(rows)).toContain('SIGN_IN_ADDRESS_LINKED')
  })

  it('a link that ran out, or was used, links nothing', async () => {
    const { confirmLink } = await import('@/lib/identity/linked-address')
    db.linkedSignInAddress.findFirst.mockResolvedValue({ id: 'l1', personId: 'p', email: 'a@b.example', expiresAt: new Date(Date.now() - 1), verifiedAt: null })
    expect((await confirmLink('tok')).ok).toBe(false)
    db.linkedSignInAddress.findFirst.mockResolvedValue({ id: 'l1', personId: 'p', email: 'a@b.example', expiresAt: null, verifiedAt: new Date() })
    expect((await confirmLink('tok')).ok).toBe(false)
    db.linkedSignInAddress.findFirst.mockResolvedValue(null)
    expect((await confirmLink('tok')).ok).toBe(false)
    expect(db.linkedSignInAddress.update).not.toHaveBeenCalled()
  })
})
