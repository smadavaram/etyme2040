import { NextRequest, NextResponse } from 'next/server'
import { queueSeat } from '../../decision-items/door'
import { outreachNo } from '../door'
import { draftWeeklyPost, draftsOf } from '@/lib/outreach/publish/draft'
import { salesGate } from '@/lib/outreach/sales-gate'

/**
 * GET  /api/outreach/publish  the firm's post drafts; a blocked draft shows only why it was blocked
 * POST /api/outreach/publish  draft this week's post from the weekly summary on the ledger
 *
 * Drafts only (matrix L3.2.2.39). Nothing posts: the sales gate is shut and no channel is chosen.
 */
export async function GET(request: NextRequest) {
  const { seat, error } = await queueSeat(request)
  if (error) return error
  const no = outreachNo(seat)
  if (no) return no
  return NextResponse.json({ data: { gate: salesGate(), drafts: await draftsOf(seat.companyId) } })
}

export async function POST(request: NextRequest) {
  const { seat, error } = await queueSeat(request)
  if (error) return error
  const no = outreachNo(seat)
  if (no) return no
  const row = await draftWeeklyPost(seat.companyId)
  if (!row) return NextResponse.json({ data: { drafted: false, says: 'There is no weekly summary on your ledger yet, so there is nothing to draft from.' } })
  return NextResponse.json({ data: { drafted: true, id: row.id, state: row.state } }, { status: 201 })
}
