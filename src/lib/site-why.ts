/**
 * What it costs, and what is already settled — the pages behind "Why Etyme".
 *
 * These two blocks used to be the eleventh and fifth sections of the home
 * page. The founder read that page on 2026-09-21 and said it is too long: it
 * was thirteen sections and about twenty-two thousand pixels of scroll on a
 * phone, because the site had no internal pages and the home page was doing
 * the work of all of them.
 *
 * Neither block belongs in the first read. `EXPOSURE` is the business case,
 * which is never why anybody buys — it is what a buyer writes down for
 * finance afterwards. `DECIDED` answers a question a reader only asks once
 * they are already interested. Both now live at /why, and the home page links
 * to them instead of carrying them.
 *
 * The words are unchanged from the home page.
 */

/**
 * The business case, which is not the reason anybody buys.
 *
 * People buy because they cannot answer the four questions on the home page.
 * They justify the purchase to finance with these three. Each one is a risk
 * and then the method that closes it, in that order, because a risk with no
 * method under it is a scare.
 */
export const EXPOSURE: { t: string; p: string }[] = [
  {
    t: 'A co-employment claim counts every supplier together',
    p:
      'One contractor can work two years on your site through two suppliers. ' +
      'The claim lands on you, not on the supplier that billed the first year. ' +
      'Etyme counts days per person across suppliers and blocks a new submission at your limit.',
  },
  {
    t: 'A supplier whose insurance lapsed keeps working',
    p:
      'Cover runs out in March and its contractors are on your site in April. ' +
      'Nobody watches the date on the certificate, because it lives in an inbox. ' +
      'Etyme reads the dates on the certificate and stops a start until the supplier renews it.',
  },
  {
    t: 'A bill is paid with no signed timesheet behind it',
    p:
      'It matched no timesheet and no order line. It was paid because the month ' +
      'closes and somebody has to approve it. ' +
      'Etyme pays only bills that match a signed week and an order.',
  },
]

/**
 * The three things about the money that are settled, because they would be
 * expensive to change later. Two of them are structural rather than a policy:
 * a firm that runs a bench cannot credibly sit between the firms that do.
 */
export const DECIDED: { t: string; p: string }[] = [
  {
    t: 'Governance is never a paid tier',
    p:
      'Tenure caps, approval chains and the record of who approved what are ' +
      'included for everybody. Any company with two hiring managers needs them. ' +
      'Charging extra for them loses the deal before the negotiation starts.',
  },
  {
    t: 'Etyme never runs a bench and never places anybody',
    p:
      'We sit between the firms that do. The moment we compete with our own ' +
      'suppliers, they stop putting their people in the system and the network ' +
      'stalls. It is built into how this works, not a policy we might change.',
  },
  {
    t: 'Looking around costs nothing and needs no card',
    p:
      'You get a live workspace with a worked example in it, and you can change ' +
      'anything in there. If it is not useful in there, a price was never going ' +
      'to fix that.',
  },
]
