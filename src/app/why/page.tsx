import type { Metadata } from 'next'
import Link from 'next/link'
import { EtymeLogo } from '@/components/logo'
import { TryDemo } from '@/components/try-demo'
import { DECIDED } from '@/lib/site-why'

/**
 * What it costs, and what is settled.
 *
 * Both halves were sections of the home page. They are here because neither
 * is a first read: the exposure is what a buyer writes down for finance after
 * the meeting, and the money answers a question only an interested reader
 * asks. Moving them is what took the home page from thirteen sections to
 * something a phone can hold.
 *
 * Every word is the home page's own. Nothing here is new copy.
 */
export const metadata: Metadata = {
  title: 'What it costs — Etyme',
  description:
    'There is no price on this page because we have not settled one. What is ' +
    'settled: governance is never a paid tier, Etyme never places anybody, and ' +
    'looking around needs no card.',
}

export default function WhyPage() {
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
        <p className="eyebrow mb-4">What it costs</p>
        <h1
          className="mb-6 max-w-[22ch] text-balance font-serif text-[36px] font-normal
                     leading-[1.05] tracking-[-0.02em] text-etyme-ink md:text-[52px]"
        >
          There is no price on this page because we have not settled one
        </h1>
        <p className="mb-5 max-w-[60ch] text-[18px] leading-relaxed text-etyme-muted md:text-[20px]">
          Etyme is free while we prove it out with the first five firms. Founding firms
          keep the terms we agree with them, in writing, before they start. We will not
          put a number on this page that we would have to take back later.
        </p>
        <p className="mb-14 max-w-[60ch] text-[17px] leading-relaxed text-etyme-ink">
          Where Etyme runs the program, it is paid the way program offices are paid: a
          percentage the suppliers pay on their billings, disclosed to every supplier
          when they join.
        </p>

        <section id="settled" className="scroll-mt-6 border-t border-etyme-rule pt-14">
          <p className="eyebrow mb-3">What is settled</p>
          <p className="max-w-[58ch] text-[17px] leading-relaxed text-etyme-ink">
            Three things about the money are settled already, because they would be
            expensive to change later.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {DECIDED.map((d) => (
              <div key={d.t} className="border-t-2 border-etyme-ink pt-5">
                <h3 className="mb-2 text-[17px] font-semibold text-etyme-ink">{d.t}</h3>
                <p className="text-[15px] leading-relaxed text-etyme-muted">{d.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-etyme-rule pt-10">
          <p className="max-w-[54ch] text-[17px] leading-relaxed text-etyme-ink">
            You can check all of it in a running program before you talk to anybody.
          </p>
          <div className="mt-6">
            <TryDemo
              side="HIRING"
              asks
              label="Open an example program →"
              className="rounded-lg bg-etyme-action px-6 py-3.5 text-sm font-semibold text-white
                         shadow-sm transition-opacity hover:opacity-90"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
