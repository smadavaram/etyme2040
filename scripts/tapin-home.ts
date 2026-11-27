/**
 * Write Tapin's Course first home onto Tapin's own record (record 134).
 *
 *   npx tsx scripts/tapin-home.ts            # says what it would write
 *   npx tsx scripts/tapin-home.ts --write    # writes the layout, the two brand colors, the font pairing and the home's content
 *
 * Run by a person, with DATABASE_URL set, after the push that adds the
 * column. It never gives the Owner's yes: changed brand values clear an
 * earlier yes, and the page keeps its standing form until Tapin's Owner
 * approves the branding in Settings. It never switches a plugin either;
 * the home is drawn only once the Owner turns Train to bench on.
 */
import { PrismaClient } from '@prisma/client'
import { TAPIN_BRANDING, TAPIN_HOME } from './tapin-home.data'

async function main() {
  const write = process.argv.includes('--write')
  const db = new PrismaClient()
  try {
    const tapin = await db.company.findFirst({ where: { slug: 'tapin' }, select: { id: true, siteTemplate: true, sitePrimaryColor: true, siteSecondaryColor: true, siteFontPairing: true } })
    if (!tapin) { console.log('tapin-home: no company at the address tapin. Nothing written.'); return }
    const changed = tapin.sitePrimaryColor !== TAPIN_BRANDING.primaryColor || tapin.siteSecondaryColor !== TAPIN_BRANDING.secondaryColor || tapin.siteFontPairing !== TAPIN_BRANDING.fontPairing
    if (!write) { console.log(`tapin-home: would set the Course first layout and Tapin's home content${changed ? ', and clear the earlier branding yes because the brand values change' : ''}. Run again with --write.`); return }
    await db.company.update({
      where: { id: tapin.id },
      data: {
        siteTemplate: TAPIN_BRANDING.template,
        sitePrimaryColor: TAPIN_BRANDING.primaryColor,
        siteSecondaryColor: TAPIN_BRANDING.secondaryColor,
        siteFontPairing: TAPIN_BRANDING.fontPairing,
        siteHome: TAPIN_HOME as unknown as object,
        ...(changed ? { siteBrandingApprovedAt: null, siteBrandingApprovedById: null, siteBrandingApprovedHash: null } : {}),
      },
    })
    console.log(`tapin-home: written.${changed ? " Tapin's Owner now approves the branding in Settings." : ''}`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('tapin-home: failed.', err instanceof Error ? err.message : 'unknown error')
  process.exit(1)
})
