import { NextRequest, NextResponse } from 'next/server'
import { confirmLink } from '@/lib/identity/linked-address'

/** POST /api/account/sign-in-addresses/confirm { token } — the one-time link, followed from the new address. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const a = await confirmLink(body.token)
  return a.ok
    ? NextResponse.json({ data: { says: a.says } })
    : NextResponse.json({ error: { code: 'LINK_REFUSED', message: a.says } }, { status: a.status })
}
