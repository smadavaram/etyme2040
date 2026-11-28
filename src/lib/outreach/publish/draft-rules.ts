/**
 * A publish draft from the weekly summary (matrix L3.2.2.39). Pure.
 *
 * Drafts only. The post is written under the one pseudonymous operator
 * brand (`PublishBrand`); while its pen name and channel are not chosen the
 * draft says so and goes nowhere. Its one figure is the week's own line on
 * the ledger, linked to that row, so nothing in the post is a number the
 * record cannot show.
 */

export interface PublishFigure { label: string; value: string; proof: { recordType: string; recordId: string }[] }
export interface PostDraft { title: string; body: string; figures: PublishFigure[] }

export const BRAND_UNSET_SAYS = 'No pen name or channel is chosen yet, so this draft stays here and is not shown to anyone else.'

export function draftFromSummary(i: { summaryLine: string; actionId: string; weekOf: string; penName: string | null }): PostDraft {
  const line = i.summaryLine.replace(/^This week:\s*/, '')
  return {
    title: `What one staffing firm's record showed, week of ${i.weekOf}`,
    body: [
      `From the record, not from memory: ${line}`,
      '',
      'Every number here is read from one firm’s own ledger. Next week, the same numbers again, good or bad.',
      '',
      `— ${i.penName ?? '(pen name not chosen)'}`,
    ].join('\n'),
    figures: [{ label: 'The week on the record', value: line, proof: [{ recordType: 'RecordAction', recordId: i.actionId }] }],
  }
}

/** A draft reaches the owner only when it passed the check and the brand has a pen name and a channel. */
export const reachesOwner = (i: { pass: boolean; penName: string | null; channel: string | null }): boolean => i.pass && !!i.penName && !!i.channel
