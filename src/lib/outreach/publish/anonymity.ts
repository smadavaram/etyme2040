/**
 * The anonymity check (matrix L3.2.2.39). Pure.
 *
 * Every publish draft passes it before it can reach the owner. It blocks a
 * draft that names a person, names a company that has not said yes to being
 * named (`Company.mayBeNamedInContent`), carries an email address, a web
 * address or a phone number, speaks of a face, a photo or a voice, or says
 * anything about the writer's own employer or day job. A draft that fails is
 * BLOCKED with its reasons and never reaches the owner.
 */

export interface AnonymityInput {
  text: string
  /** Every person the firm holds a record of: seats, contacts, candidates. */
  personNames: readonly string[]
  /** Companies on the firm's record, with each one's yes to be named. */
  companies: readonly { name: string; mayBeNamed: boolean }[]
}
export interface AnonymityVerdict { pass: boolean; reasons: string[] }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const said = (text: string, words: string) => new RegExp(`(^|[^\\p{L}])${escape(words)}($|[^\\p{L}])`, 'iu').test(text)

/** The parts of a person's name worth looking for: the whole name, and each part of four letters or more. */
const nameParts = (name: string): string[] => {
  const whole = name.trim().replace(/\s+/g, ' ')
  if (!whole) return []
  return [whole, ...whole.split(' ').filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 4)]
}

export function checkAnonymity(i: AnonymityInput): AnonymityVerdict {
  const t = i.text
  const reasons: string[] = []
  const person = i.personNames.find((n) => nameParts(n).some((p) => said(t, p)))
  if (person) reasons.push('It names a person.')
  if (i.companies.some((c) => !c.mayBeNamed && c.name.trim().length >= 2 && said(t, c.name.trim()))) reasons.push('It names a company that has not said yes to being named.')
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) reasons.push('It carries an email address.')
  if (/\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|net|org|io|co|ai|us|in)\b/i.test(t)) reasons.push('It carries a web address.')
  if (/(\+?\d[\s().-]?){9,}/.test(t)) reasons.push('It carries a phone number.')
  if (/\b(photo|photograph|selfie|my face|headshot|video of me|my voice|voice note|recording of me)\b/i.test(t)) reasons.push('It speaks of a face, a photo or a voice.')
  if (/\b(my employer|my day job|my full[- ]time job|where i work|my boss|my company pays me)\b/i.test(t)) reasons.push('It says something about the writer’s own employer.')
  return { pass: reasons.length === 0, reasons }
}
