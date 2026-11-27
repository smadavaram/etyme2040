import { Sora, Manrope } from 'next/font/google'

/**
 * The two faces of the "Sora headlines, Manrope body" pairing. A page that
 * may draw a firm's saved look puts `SITE_FONT_VARS` on its root; the stacks
 * in `site-look` then find them. Nothing is loaded for a firm that did not
 * choose the pairing beyond the two small declarations.
 */
const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700', '800'], display: 'swap', variable: '--site-font-sora' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--site-font-manrope' })

export const SITE_FONT_VARS = `${sora.variable} ${manrope.variable}`
