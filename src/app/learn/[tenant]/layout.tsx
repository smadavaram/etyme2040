import { notFound } from 'next/navigation'
import { learnTenant } from '@/lib/training/learn-read'
import { styleOf } from '@/lib/public-site/site-look'
import { SITE_FONT_VARS } from '@/lib/public-site/site-fonts'
import { VERSION } from '@/lib/training/courses/index'
import { VisitorNote } from '../_components/visitor-note'
import '../learn.css'

/**
 * The learning micro-site of one firm, in the firm's own saved branding.
 * Free and public. A firm whose plugin is off reads as no firm at all.
 */
export default async function LearnLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const t = await learnTenant(tenant)
  if (!t) notFound()
  const st = styleOf(t.look)
  // The firm's own accent, ink and heading face; without them, the micro-site's own calm defaults. Never Etyme's.
  const accent = st.accent ?? '#078f81'
  const vars = { '--learn-accent': accent, ...(t.look.primary ? { '--learn-ink': t.look.primary } : {}), ...(t.look.headFont ? { '--learn-head': t.look.headFont } : {}) } as React.CSSProperties
  return (
    <div className={`learn-root ${SITE_FONT_VARS}`} style={{ ...(st.page ?? {}), ...vars }}>
      <header className="learn-head flex items-center gap-3 px-5 py-4 border-b">
        {t.look.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.look.logoUrl} alt="" className="h-7 w-auto" />}
        <a href={`/learn/${t.slug}`} className="text-[17px] font-semibold" style={st.heading}>{t.name}</a>
        <a href={`/learn/${t.slug}/home`} className="learn-link ml-auto text-sm">Your learning</a>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      <footer className="px-5 py-6 text-sm border-t" style={{ borderColor: 'var(--learn-rule)', color: 'var(--learn-muted)' }}>
        <span>Free to take.<VisitorNote tenant={t.slug} /></span>
        <span className="float-right tabular-nums">{VERSION}</span>
      </footer>
    </div>
  )
}
