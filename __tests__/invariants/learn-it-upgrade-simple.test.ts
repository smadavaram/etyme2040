import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { IT_UPGRADE_SIMPLE as LEVEL, IT_UPGRADE_GOOD_AT, SIMPLE_GLOSSARY, SIMPLE_TRY_SAMPLES } from '@/lib/training/courses/it-upgrade-simple'
import { MEDIUM_BUILDS_ON } from '@/lib/training/courses/it-upgrade-medium'
import { trackOf, lessonsOf } from '@/lib/training/courses/index'
import { lessonGaps, termGaps, shapeGaps, mentionsPrice, videoSlotWords } from '@/lib/training/courses/shape'
import { evaluateTryIt, checkExercise } from '@/lib/training/courses/try-it'
import type { Lesson, Track } from '@/lib/training/courses/types'
import { WORKER_BOUNDARY } from '@/app/api/conversations/twin/worker'
import { britishSpellings, wordsNobodyUses } from '@/lib/positioning'

const lessons: Lesson[] = LEVEL.chapters.flatMap((c) => c.lessons)
const asTrack: Track = { key: 'it-upgrade', title: 'IT — Upgrade', goodAt: IT_UPGRADE_GOOD_AT, levels: [LEVEL] }

/** What a learner reads as sentences on one lesson; the monospace example is lines, not prose. */
const proseOf = (l: Lesson): string[] => [
  l.title, l.intro, ...(l.example.mono ? [] : [l.example.text]), l.tryIt.prompt, l.tryIt.expected,
  ...l.tryIt.rules.map((r) => r.says), l.exercise.question, ...l.exercise.choices, l.exercise.reason,
]
/** Every word a learner reads on one lesson. */
const allOf = (l: Lesson): string => [...proseOf(l), l.example.text, l.tryIt.starter].join('\n')
const sentences = (text: string): string[] => text.split(/(?<=[.?!]|[.?!]”)\s+/).map((s) => s.trim()).filter(Boolean)
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const closing = [LEVEL.project.title, ...LEVEL.project.checklist]
const lessonWords = lessons.map(allOf).join('\n')
const everyWord = [...IT_UPGRADE_GOOD_AT, ...closing, ...LEVEL.chapters.map((c) => c.title), lessonWords].join('\n')

/** How each built term shows up in a sentence, in any of its forms. "Agentic" is not "agent". */
const SAID: Record<string, RegExp> = {
  chatbot: /\bchatbots?\b/i,
  prompt: /\bprompt/i,
  model: /\bmodels?\b/i,
  reply: /\brepl(y|ies|ied)\b/i,
  limit: /\blimit/i,
  agent: /\bagents?\b/i,
  tool: /\btools?\b/i,
  skill: /\bskills?\b/i,
  approval: /\bapprov/i,
  goal: /\bgoals?\b/i,
  check: /\bcheck/i,
  record: /\brecord/i,
  agentic: /\bagentic\b/i,
}
const said = (term: string, text: string) => SAID[term].test(text)
const builderOf = (term: string) => lessons.find((l) => l.introduces[0] === term)!
const chapterOf = (term: string) => LEVEL.chapters.findIndex((c) => c.lessons.some((l) => l.introduces[0] === term)) + 1

describe('IT — Upgrade, the Simple level: its shape', () => {
  it('has three chapters, numbered one to three, each with at least three lessons', () => {
    expect(LEVEL.key).toBe('simple')
    expect(LEVEL.chapters.map((c) => c.key.slice(0, 6))).toEqual(['it-ch1', 'it-ch2', 'it-ch3'])
    for (const c of LEVEL.chapters) expect(c.lessons.length, c.title).toBeGreaterThanOrEqual(3)
  })
  it('every lesson has its four parts: a short intro, an example, a try it yourself and an exercise with a one-line reason', () => {
    expect(lessonGaps(asTrack)).toEqual([])
    for (const l of lessons) {
      expect(l.tryIt.prompt.trim(), l.key).not.toBe('')
      expect(l.exercise.question.trim(), l.key).not.toBe('')
      expect(l.exercise.choices.length, l.key).toBeGreaterThanOrEqual(2)
    }
  })
  it('every lesson is a walkthrough in one order: what is on the screen, what happens behind it, then one technical note', () => {
    for (const l of lessons) {
      const at = ['On the screen, ', 'Behind the screen, ', 'Technical note: '].map((mark) => l.intro.indexOf(mark))
      expect(at.every((n) => n >= 0), l.key).toBe(true)
      expect([...at].sort((a, b) => a - b), l.key).toEqual(at)
    }
  })
  it('no two lessons share a key, and every key says level one', () => {
    const keys = lessons.map((l) => l.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const k of keys) expect(k).toMatch(/^it-1-[123]-\d$/)
  })
  it('the level closes with one hands-on project, ticked as a checklist', () => {
    expect(LEVEL.project.checklist.length).toBeGreaterThanOrEqual(6)
    expect(new Set(LEVEL.project.checklist).size).toBe(LEVEL.project.checklist.length)
  })
  it('every lesson works without a video, and its slot reads Video coming', () => {
    for (const l of lessons) {
      expect(l.video, l.key).toBeNull()
      expect(videoSlotWords(l.video), l.key).toBe('Video coming')
    }
  })
  it('two lessons mark where an animation will go, and no animation is written yet', () => {
    const file = readFileSync(join(process.cwd(), 'src/lib/training/courses/it-upgrade-simple.ts'), 'utf8')
    expect(file.match(/\/\/ Animation slot \(Pax\): .+/g)).toEqual([
      '// Animation slot (Pax): on-ramp step 1, the chatbot',
      '// Animation slot (Pax): the five steps ask, check, decide, act, record',
    ])
    const lessonAt = (mark: string) => file.slice(0, file.indexOf(mark)).match(/key: 'it-1-\d-\d'/g)!.pop()
    expect(lessonAt('on-ramp step 1')).toBe(`key: '${builderOf('agent').key}'`)
    expect(lessonAt('the five steps ask')).toBe(`key: '${builderOf('agentic').key}'`)
    expect(file).not.toMatch(/<svg|<animate|keyframes/)
  })
  it('the track’s first level is this one, and its first lesson is the first lesson a learner opens', () => {
    const track = trackOf('it-upgrade')!
    expect(track.levels[0]).toBe(LEVEL)
    expect(lessonsOf(track)[0].lesson.key).toBe('it-1-1-1')
    expect(shapeGaps(track)).toEqual([])
  })
})

describe('IT — Upgrade, the Simple level: agent, then skill, then agentic', () => {
  it('chapter one builds agent, chapter two builds skill, chapter three builds agentic, in that order', () => {
    expect(chapterOf('agent')).toBe(1)
    expect(chapterOf('skill')).toBe(2)
    expect(chapterOf('agentic')).toBe(3)
    expect(SIMPLE_GLOSSARY.indexOf('agent')).toBeLessThan(SIMPLE_GLOSSARY.indexOf('skill'))
    expect(SIMPLE_GLOSSARY.indexOf('skill')).toBeLessThan(SIMPLE_GLOSSARY.indexOf('agentic'))
  })
  it('an agent is a helper that does not just answer: it does steps, looks things up and finishes a small job', () => {
    const intro = builderOf('agent').intro
    expect(intro).toContain('An agent is a helper that does not just answer.')
    for (const part of ['does steps for you', 'looks things up', 'finishes a small job']) expect(intro).toContain(part)
  })
  it('a skill is one job written down as steps, like a recipe card, and more skills mean more jobs', () => {
    const intro = builderOf('skill').intro
    expect(intro).toContain('A skill is one job the agent knows how to do well, written down as steps, like a recipe card.')
    expect(intro).toContain('More skills mean more jobs it can do.')
  })
  it('a skill is not a tool: the tool is built first, and the skill lesson says how the two differ', () => {
    expect(SIMPLE_GLOSSARY.indexOf('tool')).toBeLessThan(SIMPLE_GLOSSARY.indexOf('skill'))
    const skill = builderOf('skill')
    expect(skill.example.text).toContain('The tool is the order list. The skill is the card of steps.')
    expect(skill.exercise.choices[skill.exercise.correctIndex]).toBe('A tool is something the agent uses; a skill is the written steps for one job')
  })
  it('agentic means working step by step toward a goal and checking as you go, on a whole job', () => {
    const intro = builderOf('agentic').intro
    expect(intro).toContain('Agentic means working step by step toward a goal and checking as you go.')
    expect(intro).toContain('a whole job, not just one answer')
  })
  it('an agent’s five steps are always shown in one order: ask, check, decide, act, record', () => {
    const l = builderOf('agentic')
    expect(l.intro).toContain('ask, check, decide, act, record')
    const at = ['Ask ', 'Check ', 'Decide ', 'Act ', 'Record '].map((w) => l.example.text.indexOf(w))
    expect(at.every((n) => n >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    for (const text of everyWord.match(/\bask, [a-z, ]+/gi) ?? []) expect(text.toLowerCase()).toContain('ask, check, decide, act, record')
  })
  it('the level ends on the record: every step is written down before agentic work puts the steps together', () => {
    expect(SIMPLE_GLOSSARY.slice(-4)).toEqual(['goal', 'check', 'record', 'agentic'])
    expect(builderOf('record').title).toBe('A record: every step written down')
  })
})

describe('IT — Upgrade, the Simple level: one new idea a lesson, and no word before its lesson', () => {
  it('every lesson builds exactly one term, and the terms are built in the glossary’s order', () => {
    for (const l of lessons) expect(l.introduces.length, l.key).toBe(1)
    expect(lessons.map((l) => l.introduces[0])).toEqual([...SIMPLE_GLOSSARY])
    expect(Object.keys(SAID)).toEqual([...SIMPLE_GLOSSARY])
  })
  it('no lesson declares a term before the lesson that builds it', () => {
    expect(termGaps(asTrack)).toEqual([])
  })
  it('no lesson’s words use a term before the lesson that builds it', () => {
    const found: string[] = []
    lessons.forEach((l, i) => {
      for (const later of SIMPLE_GLOSSARY.slice(i + 1)) if (said(later, allOf(l))) found.push(`${l.key} says "${later}" early`)
    })
    expect(found).toEqual([])
  })
  it('a chapter’s title uses only terms that chapter, or an earlier one, builds', () => {
    const found: string[] = []
    LEVEL.chapters.forEach((c, n) => {
      for (const t of SIMPLE_GLOSSARY) if (said(t, c.title) && chapterOf(t) > n + 1) found.push(`"${c.title}" says "${t}" early`)
    })
    expect(found).toEqual([])
  })
  it('the lesson that builds a term says the term in its title and in its intro', () => {
    for (const l of lessons) {
      expect(said(l.introduces[0], l.title), l.key).toBe(true)
      expect(said(l.introduces[0], l.intro), l.key).toBe(true)
    }
  })
  it('a lesson declares every earlier term its words use, and declares none it does not use', () => {
    const gaps: string[] = []
    lessons.forEach((l, i) => {
      for (const earlier of SIMPLE_GLOSSARY.slice(0, i)) {
        if (said(earlier, allOf(l)) && !l.uses.includes(earlier)) gaps.push(`${l.key} says "${earlier}" and does not declare it`)
        if (!said(earlier, allOf(l)) && l.uses.includes(earlier)) gaps.push(`${l.key} declares "${earlier}" and never says it`)
      }
    })
    expect(gaps).toEqual([])
  })
  it('the list of what you will be good at uses everyday words: none of the terms a lesson builds', () => {
    expect(IT_UPGRADE_GOOD_AT.length).toBe(5)
    for (const g of IT_UPGRADE_GOOD_AT) {
      expect(SIMPLE_GLOSSARY.filter((t) => said(t, g)), g).toEqual([])
      expect(g, g).toMatch(/^(Explain|Write|Find|Say) /)
    }
    expect(trackOf('it-upgrade')!.goodAt).toEqual(IT_UPGRADE_GOOD_AT)
  })
  it('the level builds every term the Medium level says it builds on', () => {
    for (const t of MEDIUM_BUILDS_ON) expect(SIMPLE_GLOSSARY, t).toContain(t)
  })
})

describe('IT — Upgrade, the Simple level: Milo at Maple Mart is the running example', () => {
  it('the first lesson says who Milo is and what Maple Mart is', () => {
    expect(lessons[0].example.text).toContain('Milo works the help counter at a store named Maple Mart.')
  })
  it('every lesson is set at Maple Mart or names Milo', () => {
    for (const l of lessons) expect(allOf(l), l.key).toMatch(/Maple Mart|Milo/)
  })
  it('customers ask the three everyday questions: opening hours, a return, and where an order is', () => {
    expect(lessonWords).toMatch(/What time do you open/)
    expect(lessonWords).toMatch(/\breturn/)
    expect(lessonWords).toMatch(/Where is my order\?/)
  })
  it('the chatbot of this level has not read the store’s papers: no lesson has it quote a policy or a document', () => {
    expect(lessonWords).not.toMatch(/\bpolic(y|ies)\b|\bdocuments?\b/i)
  })
  it('the only story told is Milo’s: none of the examples kept out of this course appears', () => {
    const keptOut = /\b(refund\w*|blender|briefing|handyman|shipping container|train|camera|lens|carpenter|relay|runbook|whiteboard)\b/i
    expect(everyWord.match(keptOut)).toBeNull()
    expect(everyWord).not.toMatch(/\b(?:Inc|LLC|Ltd|Corp)\b/)
  })
})

describe('IT — Upgrade, the Simple level: a person decides', () => {
  it('an agent drafts and answers, and a person decides money, signing and anything about a person', () => {
    const intro = builderOf('approval').intro
    expect(intro).toContain('An agent drafts and answers.')
    expect(intro).toContain('A person decides money, signing and anything about a person.')
  })
  it('giving money back is not on the agent’s list of tools, and Milo is the one who says yes', () => {
    expect(builderOf('tool').example.text).toMatch(/Not on its list\n\s+give money back/)
    const approval = builderOf('approval')
    expect(approval.example.text).toContain('says Yes or Not now')
    expect(evaluateTryIt(approval, 'The agent decides.').passed).toBe(false)
    expect(approval.exercise.choices[approval.exercise.correctIndex]).toBe('Draft an answer about opening hours')
  })
  it('finishing is never called a certification, and nobody is called certified', () => {
    expect(everyWord).not.toMatch(/certif/i)
  })
})

describe('IT — Upgrade, the Simple level: try it and the exercise', () => {
  it('every try-it has a sample that passes and a sample that fails', () => {
    expect(Object.keys(SIMPLE_TRY_SAMPLES).sort()).toEqual(lessons.map((l) => l.key).sort())
    for (const l of lessons) {
      const s = SIMPLE_TRY_SAMPLES[l.key]
      const right = evaluateTryIt(l, s.right)
      expect(right.passed, `${l.key}: ${JSON.stringify(right.lines)}`).toBe(true)
      expect(right.output, l.key).toBe(l.tryIt.expected)
      const wrong = evaluateTryIt(l, s.wrong)
      expect(wrong.passed, l.key).toBe(false)
      expect(wrong.lines.some((x) => !x.ok && x.text.trim() !== ''), l.key).toBe(true)
    }
  })
  it('no try-it is passed by the text it starts with, or by an empty box', () => {
    for (const l of lessons) {
      expect(evaluateTryIt(l, '').passed, l.key).toBe(false)
      if (l.tryIt.starter.trim()) expect(evaluateTryIt(l, l.tryIt.starter).passed, l.key).toBe(false)
    }
  })
  it('every exercise has one right answer, and a wrong answer gets the same one-line reason', () => {
    for (const l of lessons) {
      expect(new Set(l.exercise.choices).size, l.key).toBe(l.exercise.choices.length)
      const picks = l.exercise.choices.map((_, n) => checkExercise(l, n))
      expect(picks.filter((p) => p.right).length, l.key).toBe(1)
      for (const p of picks) expect(p.reason, l.key).toBe(l.exercise.reason)
      expect(sentences(l.exercise.reason).length, l.key).toBe(1)
    }
  })
})

describe('IT — Upgrade, the Simple level: the words', () => {
  it('every intro is short: seventy words at most', () => {
    expect(lessons.filter((l) => wordCount(l.intro) > 70).map((l) => `${l.key}: ${wordCount(l.intro)} words`)).toEqual([])
  })
  it('no sentence a learner reads is longer than twenty-five words', () => {
    const prose = [...IT_UPGRADE_GOOD_AT, ...closing, ...LEVEL.chapters.map((c) => c.title), ...lessons.flatMap(proseOf)]
    expect(prose.flatMap(sentences).filter((s) => wordCount(s) > 25)).toEqual([])
  })
  it('the level says no price and no charge of any kind', () => {
    expect(mentionsPrice(everyWord)).toBe(false)
    expect(everyWord).not.toMatch(/\b(paid plan|pricing|priced|billed|subscription|dollars?|cents?)\b|[$€£]/i)
  })
  it('the spelling is American, and neither of the two words nobody uses appears', () => {
    expect(wordsNobodyUses(everyWord)).toEqual([])
    expect(britishSpellings(everyWord)).toEqual([])
  })
  it('a public page of the course never says the firm trains or places anybody, and never whose firm it is', () => {
    expect(everyWord).not.toMatch(/\bTapin (trains|places|teaches)\b|\bfounder\b|\bEtyme’s own\b/i)
  })
})

describe('IT — Upgrade, the Simple level: what it says of Etyme is what the code does', () => {
  it('a worker’s chat on Etyme sends nothing she types to a model, as the model lesson says', () => {
    expect(WORKER_BOUNDARY).toContain('Nothing you type leaves to a model.')
    expect(builderOf('model').intro).toContain('On Etyme, the platform Tapin runs on, a worker’s chat sends her words to none.')
    expect(lessonWords.match(/Etyme/g)).toHaveLength(1)
  })
})
