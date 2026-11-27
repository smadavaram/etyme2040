/**
 * Tapin's Course first home (record 134): the palette, picture and words of
 * Pax's reference page of 2026-11-27, kept word for word. This is Tapin's
 * content, written to Tapin's own record by `scripts/tapin-home.ts`; the
 * page reads the record, never this file.
 */
export const TAPIN_BRANDING = {
  template: 'COURSE_FIRST',
  primaryColor: '#0A1C2C',
  secondaryColor: '#0DB5A3',
  fontPairing: 'SORA_MANROPE',
} as const

export const TAPIN_HOME = {
  palette: {
    ink: '#0a1c2c', ink2: '#0f2a40', ink3: '#14334d',
    accent: '#0db5a3', accentDark: '#078f81', accentSoft: '#e0f5f1',
    text: '#eaf2f7', muted: '#a9bfce',
    paper: '#f6f9fa', card: '#ffffff', line: '#dce8ec', body: '#33505f',
  },
  heroImage: { src: '/tenants/tapin/hero.webp', alt: 'Tapin consultants working with data' },
  words: {
    nav: { course: 'AI for Everyone', bench: 'Career Bench', teams: 'Pods', clients: 'For Clients' },
    hero: {
      kicker: 'Tapin · AI for Everyone',
      headBefore: 'Learn AI.', headMark: 'Get on the record.', headAfter: 'Get the work.',
      lede: 'A free course that takes you from your first chatbot to an agent that does real work — one small lesson at a time, in plain words.',
      sub: 'Built by Tapin for the people who do the work: students, career starters, non-IT professionals, and IT consultants upgrading their skills.',
      start: 'Start learning — it’s free',
      join: 'Join the bench',
    },
    course: {
      kicker: 'The course',
      heading: 'First — one question: What are you?',
      lede: 'Pick where you stand today. Each path has 9 chapters in 3 levels — Simple, Medium, Complex — one small idea per screen, something to try on every screen, and a project at the end of each level.',
      goodAt: 'What you will be good at: explaining what a skill, an agent and agentic work actually are — in plain words — and building each one yourself, step by step, checking as you go.',
      go: 'Start this path →',
      cards: {
        kids: { icon: '🎒', line: 'Stories and small builds. What AI is, how it helps, how to stay in charge of it.' },
        entry: { icon: '🌱', line: 'Starting a career in the AI era — the tools, the habits, the first real project.' },
        'non-it': { icon: '💼', line: 'AI for your actual job — documents, email, reports — no code, no jargon first.' },
        'it-upgrade': { icon: '⚙️', line: 'Chatbot → documents → agent, then a screen-by-screen walkthrough of real product work.' },
      },
    },
    ramp: {
      kicker: 'How the course climbs',
      heading: 'Three steps. That is the whole climb.',
      lede: 'Every track walks the same on-ramp. Watch it once here — then build each step yourself inside the course.',
      note: 'A skill is one job the agent knows how to do well, written down as steps. Agentic means working step by step toward a goal, checking as you go. You will meet both in the Simple chapters — before the course uses the words anywhere else.',
      stages: [
        { tag: 'Step 1 · Simple', title: 'The chatbot', line: 'It answers from what it was taught. Fast — but it has never seen your documents.', bubble: '“What is our refund window?”\n→ “Usually 30 days.” (a guess)' },
        { tag: 'Step 2 · Medium', title: 'The chatbot with your documents', line: 'Now it reads your policy first, then answers — and shows you the page it read.', bubble: '“What is our refund window?”\n→ “14 days — Policy, page 3.” (sourced)' },
        {
          tag: 'Step 3 · Complex', title: 'The agent', line: 'A helper that does steps for you — and writes down everything it did.',
          steps: ['1 · Ask — what is being requested?', '2 · Check — the order, the policy', '3 · Decide — inside the rules', '4 · Act — refund issued', '5 · Record — every step on the record'],
        },
      ],
    },
    doors: {
      kicker: 'After the course',
      heading: 'Learning turns into work — two doors',
      lede: 'Finish a path and the record carries your proof: chapters done, projects checked, skills earned. That proof is what both doors read.',
      bench: {
        title: 'Career Bench',
        line: 'For consultants and candidates. Get profiled, get interviews — with your course proof already on your record.',
        points: ['Your completions and badges sit on your record as evidence', 'Mentors see the cohort board — and who is ready', 'Share your completion on LinkedIn, from your own record'],
        go: 'Join the bench →',
      },
      teams: {
        title: 'Pods',
        line: 'For clients. Buy the outcome: one pod, one fixed-scope sprint — staffed from a bench that is ready when the role opens.',
        points: ['Interview-ready consultants, proof on the record', 'Role in. Interview. Start.', 'One fixed scope, one price, no surprises'],
        go: 'See how pods work →',
      },
    },
    bench: {
      kicker: 'Career Bench',
      heading: 'Why the bench is ready when the role opens',
      lede: 'Most benches are a list of names. Ours is a record of proof — trained, checked, and visible.',
      steps: [
        { tag: '01', title: 'Learn', line: 'Take the free course in your track. Every lesson and project lands on your record as you finish it.' },
        { tag: '02', title: 'Get profiled', line: 'Say yes to the bench and your proof becomes your profile — skills first, claims second.' },
        { tag: '03', title: 'Get interviews', line: 'When a role matches your record, you hear about it with the evidence already attached.' },
      ],
      action: 'Start with the free course',
    },
    teams: {
      kicker: 'Pods · For clients',
      heading: 'Interview-ready consultants — or the whole outcome',
      lede: 'Data engineering consultants, ready when the role opens. Or skip the hiring entirely: one pod, one fixed-scope sprint, one accountable team.',
      steps: [
        { tag: 'Role in', title: 'Send the role', line: 'You describe the work. We match it against records — not keywords.' },
        { tag: 'Interview', title: 'Meet proof first', line: 'Every consultant arrives with training and project proof on their record.' },
        { tag: 'Start', title: 'Work on the record', line: 'Timesheets, deliverables and invoices on one record — every decision defensible.' },
      ],
    },
    client: {
      heading: 'Have a data engineering role open?',
      line: 'Send the role. We answer with people whose proof you can check — or a pod that owns the outcome.',
      action: 'Talk to Tapin',
    },
    footer: { line: 'AI for Everyone — free, public, on the record.', motto: 'Every contractor. Every supplier. One record.' },
  },
} as const
