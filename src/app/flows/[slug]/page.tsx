import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EtymeLogo } from '@/components/logo'
import { FlowDrawing } from '@/components/flow-diagram'
import { FLOW_PAGES } from '@/lib/flows.generated'
import { TryDemo } from '@/components/try-demo'

/**
 * A flow page: one part of the operating model, drawn.
 *
 * The home page argues. These pages show. Each one takes the streams that
 * belong together, draws them, and lists every station in the words of the
 * person standing at it — so a reader can check the claim rather than take it.
 *
 * Content is generated: docs/lanes/public.mjs reads the same streams.mjs the
 * party documents are drawn from, drops the trade-language tables that name
 * another system, and writes src/lib/flows.generated.ts.
 */
export function generateStaticParams() {
  return FLOW_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = FLOW_PAGES.find((p) => p.slug === slug)
  if (!page) return { title: 'Not found' }
  return { title: `${page.title} — Etyme`, description: page.lede }
}

export default async function FlowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = FLOW_PAGES.find((p) => p.slug === slug)
  if (!page) notFound()

  const others = FLOW_PAGES.filter((p) => p.slug !== page.slug)

  return (
    <main className="min-h-screen bg-etyme-canvas">
      <header className="border-b border-etyme-rule">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Etyme, home">
            <EtymeLogo size="md" />
          </Link>
          <Link
            href="/"
            className="ml-auto text-sm font-medium text-etyme-muted underline underline-offset-4
                       transition-colors hover:text-etyme-ink"
          >
            Back to the overview
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 md:pt-16">
        <p className="eyebrow mb-4">{page.eyebrow}</p>
        <h1
          className="mb-6 max-w-[20ch] text-balance font-serif text-[36px] font-normal
                     leading-[1.05] tracking-[-0.02em] text-etyme-ink md:text-[52px]"
        >
          {page.title}
        </h1>
        <p className="mb-12 max-w-[62ch] text-[18px] leading-relaxed text-etyme-ink md:text-[20px]">
          {page.lede}
        </p>

        <div className="space-y-16">
          {page.diagrams.map((d) => (
            <FlowDrawing key={`${page.slug}-${d.code}`} d={d} />
          ))}
        </div>

        <section className="mt-20 border-t border-etyme-rule pt-10">
          <p className="max-w-[54ch] text-[17px] leading-relaxed text-etyme-ink">
            Every station above is a real screen in the example program. You can open it
            and change anything in it.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <TryDemo
              side="HIRING"
              asks
              label="Open an example program →"
              className="rounded-lg bg-etyme-action px-6 py-3.5 text-sm font-semibold text-white
                         shadow-sm transition-opacity hover:opacity-90"
            />
          </div>

          <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-etyme-rule bg-etyme-rule sm:grid-cols-3">
            {others.map((p) => (
              <li key={p.slug} className="bg-etyme-raised">
                <Link href={`/flows/${p.slug}`} className="block px-5 py-4 hover:bg-etyme-canvas">
                  <span className="block font-mono text-[10.5px] uppercase tracking-[0.1em] text-etyme-faint">
                    {p.eyebrow}
                  </span>
                  <span className="mt-1.5 block font-serif text-[18px] leading-snug text-etyme-ink">
                    {p.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
