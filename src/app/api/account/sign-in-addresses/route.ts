import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { requestLink } from '@/lib/identity/linked-address'

/**
 * POST /api/account/sign-in-addresses { email }
 * The signed-in person asks to link a second sign-in address. The person is
 * read from the session, never from the body. A link goes to the new address.
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request })
  const me = typeof token?.email === 'string'
    ? await prisma.person.findUnique({ where: { primaryEmail: token.email }, select: { id: true } })
    : null
  if (!me) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in again to link an address.' } }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const a = await requestLink(me.id, body.email)
  return a.ok
    ? NextResponse.json({ data: { says: a.says } })
    : NextResponse.json({ error: { code: 'LINK_REFUSED', message: a.says } }, { status: a.status })
}
