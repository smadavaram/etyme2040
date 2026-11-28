/**
 * The sales gate (matrix L3.2.2.40). Pure.
 *
 * Learning mode: the advanced outreach plugin drafts, assembles and is
 * approved, and nothing it makes leaves. The gate is one constant in code.
 * No column, no setting, no route, no agent and no seat can open it; only a
 * code change made on the owner's word does.
 *
 * Lead's decision (2026-11-28; Pax may overrule): the gate covers the
 * ADVANCED plugin's sends only, which are campaign packs, the outcome series
 * and publish posts. Basic core letters (record 135: a direct letter to one
 * contact, a candidate update letter, a selling batch raised by a person)
 * never read it.
 */

/** Shut. Changing this line is the owner's decision and nobody else's. */
export const SALES_GATE_OPEN = false as const

/** What the task's ledger line says while the gate holds a send. */
export const SALES_GATE_HELD = 'held: the sales gate is shut'
/**
 * The ledger action for that line, written once per task. It is the
 * declared "not sent" action the Outreach plugin already lists; a dedicated
 * action needs a line in lib/plugin-registry, which is not this domain's.
 */
export const SALES_GATE_HELD_ACTION = 'OUTREACH_LETTER_NOT_SENT'

/** The kinds of send the gate covers. Anything else is basic outreach and is not gated. */
export type GatedSend = 'PACK' | 'OUTCOME_SERIES' | 'PUBLISH_POST'

/** The one reader. Every advanced send asks it first. */
export function salesGate(): { open: boolean; says: string } {
  return SALES_GATE_OPEN
    ? { open: true, says: 'The sales gate is open.' }
    : { open: false, says: 'Nothing sends yet: Etyme is in learning mode, and the sales gate stays shut until the owner opens it.' }
}

/** Whether a send of this kind may leave now. Basic letters are never asked. */
export const gateLets = (_kind: GatedSend): boolean => salesGate().open
