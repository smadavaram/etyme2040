# Etyme

**The system of record for contingent workers — the layer between a
company and every staffing supplier it uses.**

The span is requisition → suppliers → submissions → screening →
interviews → onboarding → timesheets → invoices → compliance. Naming one
station makes the whole product read as that station, so it names all of
them.

The sharpest thing in it is tenure: a contractor's time on site
aggregated across every supplier. No vendor can compute it — they cannot
see the other eleven. No client can obtain it by asking, because each
vendor reports only their own. It exists exactly once, in the middle.

Read `CLAUDE.md` before changing anything. It carries the positioning,
the ratified decisions, the invariants the database enforces, and how
work here is verified.

## Stack

Next.js 14 (App Router) · TypeScript · Prisma · Postgres · NextAuth ·
Vitest · Tailwind.

## Running it

```bash
npm install
cp .env.example .env.local     # DATABASE_URL and NEXTAUTH_SECRET at minimum
npx prisma db push
npx prisma db seed
npm run dev
```

## Checking it

```bash
npm test          # the whole suite
npm run typecheck
npm run build
```

Tests are named as English sentences on purpose — a non-technical reader
should be able to read the test names and tell whether the right thing
was built.

## What is not here

The 2017 Rails application. Its business rules were read, written up in
`LEGACY_RULES.md`, and reimplemented; the code itself lives in the old
repository and nothing here depends on it.
