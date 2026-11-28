import { NextRequest, NextResponse } from 'next/server'
import { queueSeat, refused } from '../../decision-items/door'
import { outreachNo } from '../door'
import { proposeSeries, seriesOf } from '@/lib/outreach/series'
import { mineOutcomes } from '@/lib/outreach/outcome-mining'
import { prisma } from '@/lib/db'
import { salesGate } from '@/lib/outreach/sales-gate'

/**
 * GET  /api/outreach/series  the firm's outcomes and outcome series, and whether anything may send
 * POST /api/outreach/series  { mine: true } reads last week's outcomes from the firm's own record;
 *                            { name, segmentId, outcomeIds, replyOwnerPersonId? } proposes one series for one yes
 *
 * Advanced outreach (record 135). Nothing here sends: the sales gate is shut.
 */
export async function GET(request: NextRequest) {
  const { seat, error } = await queueSeat(request)
  if (error) return error
  const no = outreachNo(seat)
  if (no) return no
  const outcomes = await prisma.outreachOutcome.findMany({ where: { companyId: seat.companyId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30 })
  return NextResponse.json({ data: {
    gate: salesGate(),
    outcomes: outcomes.map((o) => ({ id: o.id, kind: o.kind, title: o.title, figures: o.figures, failureIncluded: o.failureIncluded, state: o.state, week: o.minedForWeek })),
    series: await seriesOf(seat.companyId),
  } })
}

export async function POST(request: NextRequest) {
  const { seat, error } = await queueSeat(request)
  if (error) return error
  const no = outreachNo(seat)
  if (no) return no
  const body = await request.json().catch(() => null)
  if (body && typeof body === 'object' && (body as { mine?: unknown }).mine === true) {
    const out = await mineOutcomes(seat.companyId)
    return NextResponse.json({ data: { week: out.week, outcomes: out.outcomes.length } })
  }
  const out = await proposeSeries({ companyId: seat.companyId, personId: seat.personId }, body)
  if (!out.ok) return refused(out.status, out.says, out.field)
  return NextResponse.json({ data: { id: out.id, taskId: out.taskId, letters: out.letters } }, { status: 201 })
}
