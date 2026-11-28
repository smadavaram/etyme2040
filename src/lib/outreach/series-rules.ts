/**
 * The outcome series, as letters (matrix L3.2.2.31). Pure.
 *
 * The locked format: a named person writes; one real outcome per letter
 * with its real numbers; what went wrong is said; the lesson is the pitch;
 * one small step, mapped to an onboarding step; a reply reaches the person.
 * A letter whose figures do not all trace is not proof-checked, and a series
 * holding one is refused before it reaches anyone's card.
 */
import { ONBOARDING_STEP, everyFigureTraces, type OutcomeFigure, type OutcomeKind } from './outcome-mining-rules'

export const SERIES_DAYS_APART = 7
export const SERIES_MAX = 6

export interface SeriesOutcome { id: string; kind: OutcomeKind; title: string; figures: OutcomeFigure[]; failureIncluded: boolean; lesson: string | null }
export interface SeriesLetter { position: number; outcomeId: string; subject: string; body: string; onboardingStep: string; offsetDays: number; proofChecked: boolean }

const shown = (f: OutcomeFigure) => `${f.value}${f.unit === 'hours' ? ' hours' : ''}`

/** One letter of the series, from one outcome. */
export function draftSeriesLetter(o: SeriesOutcome, i: { position: number; writer: string; firm: string }): SeriesLetter {
  const wins = o.figures.filter((f) => !f.failure)
  const fails = o.figures.filter((f) => f.failure)
  const step = ONBOARDING_STEP[o.kind]
  const wrong = fails.length && o.failureIncluded
    ? fails.map((f) => `${f.label}: ${shown(f)}.`).join(' ')
    : 'Nothing went wrong this time, and we would say so if it had.'
  const body = [
    `${i.writer} here, from ${i.firm}.`,
    '',
    `What happened: ${o.title}.`,
    ...wins.map((f) => `- ${f.label}: ${shown(f)}`),
    '',
    `What went wrong: ${wrong}`,
    '',
    `The lesson: ${o.lesson ?? 'The record shows it, so we can say it.'}`,
    '',
    `One small step: ${step.says}`,
    '',
    `Reply to this letter and it reaches ${i.writer}.`,
  ].join('\n')
  return {
    position: i.position, outcomeId: o.id, subject: o.title, body, onboardingStep: step.key,
    offsetDays: (i.position - 1) * SERIES_DAYS_APART, proofChecked: everyFigureTraces(o.figures),
  }
}

export interface SeriesAsk { name: string; segmentId: string; outcomeIds: string[]; replyOwnerPersonId: string | null }

/** What a person asked for as a series, or the field and sentence that is missing. */
export function readSeriesAsk(raw: unknown): { ok: true; ask: SeriesAsk } | { ok: false; field: string; says: string } {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!name) return { ok: false, field: 'name', says: 'Give the series a name.' }
  if (name.length > 80) return { ok: false, field: 'name', says: 'Keep the name under 80 characters.' }
  if (typeof b.segmentId !== 'string' || !b.segmentId) return { ok: false, field: 'segmentId', says: 'Choose the segment the series writes to.' }
  const ids = Array.isArray(b.outcomeIds) ? [...new Set(b.outcomeIds.filter((x): x is string => typeof x === 'string' && x !== ''))] : []
  if (ids.length === 0) return { ok: false, field: 'outcomeIds', says: 'Choose at least one outcome from your record for the series to tell.' }
  if (ids.length > SERIES_MAX) return { ok: false, field: 'outcomeIds', says: `A series tells ${SERIES_MAX} outcomes at most. More is a second series.` }
  const reply = typeof b.replyOwnerPersonId === 'string' && b.replyOwnerPersonId ? b.replyOwnerPersonId : null
  return { ok: true, ask: { name, segmentId: b.segmentId, outcomeIds: ids, replyOwnerPersonId: reply } }
}

/** The card for the one yes: the whole series is on it, and nothing after it asks again. */
export function seriesCard(i: { name: string; segmentWords: string; letters: readonly SeriesLetter[]; writer: string; tradeHoursSays: string | null; gateSays: string }): { question: string; detail: string } {
  return {
    question: `Outreach: approve the series "${i.name}"? ${i.letters.length} ${i.letters.length === 1 ? 'letter' : 'letters'}, one yes for all of them.`,
    detail: [
      `Who: ${i.segmentWords}`,
      `Written by ${i.writer}. Replies go to ${i.writer}.`,
      ...i.letters.map((l) => `Letter ${l.position}, day ${l.offsetDays + 1}: ${l.subject}`),
      'Every number in these letters is read from your own record, and each one links to the rows it was counted from.',
      ...(i.tradeHoursSays ? [i.tradeHoursSays] : []),
      i.gateSays,
    ].join('\n'),
  }
}
