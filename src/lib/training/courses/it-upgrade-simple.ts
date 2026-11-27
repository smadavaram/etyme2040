import type { Level } from './types'

/**
 * IT — Upgrade, level 1: Simple (chapters 1 to 3). What it is, in plain
 * words: a chatbot answers and an agent does; a skill is one job written
 * down as steps; agentic work goes step by step toward a goal, checking
 * as it goes, and every step is written on a record.
 *
 * The one running example is the course's own: Milo, who works the help
 * counter at a store named Maple Mart, and the store's help chat. At this
 * level the chatbot has never seen the store's own papers.
 *
 * Each lesson is a walkthrough in one order: what is on the screen, what
 * happens behind it, and one technical note. The single product fact kept
 * here is read from `app/api/conversations/twin/worker.ts`: nothing a
 * worker types in her Etyme chat is sent to a model.
 */

/** The order this level builds its terms in: one new idea a lesson. */
export const SIMPLE_GLOSSARY: readonly string[] = [
  'chatbot', 'prompt', 'model', 'reply', 'limit', 'agent',
  'tool', 'skill', 'approval',
  'goal', 'check', 'record', 'agentic',
]

/**
 * "What you will be good at": plain verbs and everyday words only. No line
 * uses a term that needs a lesson. The Complex level's recap repeats these
 * lines word for word.
 */
export const IT_UPGRADE_GOOD_AT: string[] = [
  'Explain the difference between a helper that only answers and one that does the steps for you',
  'Write down one job as clear steps that a helper can follow',
  'Write a clear request and look closely at what comes back',
  'Find the answer to a question in your firm’s own documents',
  'Say what software may do alone and what needs a person’s yes',
]

export const IT_UPGRADE_SIMPLE: Level = {
  key: 'simple',
  title: 'Simple',
  chapters: [
    {
      key: 'it-ch1-a-chatbot-answers-an-agent-does',
      title: 'A chatbot answers. An agent does.',
      lessons: [
        {
          key: 'it-1-1-1',
          title: 'A chatbot: a chat that answers',
          intro:
            'A chatbot is a program that answers typed questions in a chat. ' +
            'On the screen, a customer types a question into Maple Mart’s help chat and reads an answer. ' +
            'Behind the screen, the program reads the question and writes words back. ' +
            'Technical note: it only writes words. Nothing in the store changes.',
          introduces: ['chatbot'],
          uses: [],
          example: {
            mono: true,
            text:
              'Milo works the help counter at a store named Maple Mart.\n' +
              'The store also has a help chat on its website.\n\n' +
              'Customer   What time do you open on Sunday?\n' +
              'Help chat  Many stores open later on Sunday. Ask the store to be sure.',
          },
          tryIt: {
            prompt: 'A customer wants to know where her order is. Type the question she sends to Maple Mart’s help chat.',
            starter: '',
            rules: [
              { kind: 'contains', value: '?', says: 'It is a question.' },
              { kind: 'contains', value: 'order', says: 'It asks about her order.' },
              { kind: 'maxWords', value: 12, says: 'It asks one thing, in a few words.' },
            ],
            expected: 'A good question for a chat: short, and about one thing.',
          },
          exercise: {
            question: 'What does a chatbot do?',
            choices: ['It answers typed questions in a chat', 'It packs orders in the store', 'It repairs the store’s computers'],
            correctIndex: 0,
            reason: 'A chatbot is a program that answers what you type.',
          },
          video: null,
        },
        {
          key: 'it-1-1-2',
          title: 'The prompt: what you send',
          intro:
            'The text you send to a chatbot is a prompt. ' +
            'A clear prompt asks one thing and names its subject. ' +
            'On the screen, a Maple Mart customer types in the box and presses Send. ' +
            'Behind the screen, the chatbot receives her prompt as plain text. ' +
            'Technical note: the chatbot gets only those words. It cannot see the customer or the store.',
          introduces: ['prompt'],
          uses: ['chatbot'],
          example: {
            mono: true,
            text:
              'Vague prompt   Help with my thing.\n' +
              'Clear prompt   Where is my order of two blue mugs?',
          },
          tryIt: {
            prompt: 'This prompt is vague: “Tell me about returns.” Rewrite it to ask one thing about returning a pair of shoes.',
            starter: '',
            rules: [
              { kind: 'contains', value: 'return', says: 'It says what it is about: a return.' },
              { kind: 'contains', value: '?', says: 'It asks a question.' },
              { kind: 'maxWords', value: 14, says: 'It asks one thing.' },
            ],
            expected: 'A clear prompt: one question, about one thing.',
          },
          exercise: {
            question: 'Which is the clearer prompt?',
            choices: ['Order stuff?', 'Where is the order I placed on Monday?'],
            correctIndex: 1,
            reason: 'It asks one thing and says which order.',
          },
          video: null,
        },
        {
          key: 'it-1-1-3',
          title: 'The model: where the words come from',
          intro:
            'Many chatbots get their words from a model. ' +
            'A model is a program that learned the patterns of language from a great deal of text. ' +
            'On the screen, an answer appears. ' +
            'Behind the screen, the model wrote it by choosing likely next words. ' +
            'Technical note: not every chat uses a model. ' +
            'On Etyme, the platform Tapin runs on, a worker’s chat sends her words to none.',
          introduces: ['model'],
          uses: ['chatbot', 'prompt'],
          example: {
            mono: true,
            text:
              'Prompt         The store opens at\n' +
              'Likely words   nine, ten, eight\n\n' +
              'The model picks a likely word.\n' +
              'It did not look at the door of Maple Mart.',
          },
          tryIt: {
            prompt: 'Finish the sentence: say what a model learned from.',
            starter: 'A model learned from ',
            rules: [
              { kind: 'containsAny', values: ['text', 'writing', 'words', 'language'], says: 'It names what the model learned from.' },
              { kind: 'minWords', value: 6, says: 'It is a whole sentence.' },
            ],
            expected: 'Yes. A model learned from text, not from the store’s own papers.',
          },
          exercise: {
            question: 'Has a model read Maple Mart’s list of orders?',
            choices: ['Yes, it reads everything', 'No, it learned from other text', 'Only on weekdays'],
            correctIndex: 1,
            reason: 'A model knows the text it learned from and the prompt, nothing else.',
          },
          video: null,
        },
        {
          key: 'it-1-1-4',
          title: 'The reply: what comes back',
          intro:
            'The text a chatbot sends back is a reply. One prompt gets one reply. ' +
            'On the screen, the reply appears under the customer’s prompt. ' +
            'Behind the screen, a model’s reply can change from one try to the next. ' +
            'Technical note: it chooses likely words, so the same prompt may get different words.',
          introduces: ['reply'],
          uses: ['chatbot', 'prompt', 'model'],
          example: {
            mono: true,
            text:
              'Maple Mart’s help chat, asked twice\n\n' +
              'Prompt    What time do you open on Sunday?\n' +
              'Reply 1   Many stores open at ten on Sunday.\n' +
              'Reply 2   Sunday hours are often shorter. Ask the store.',
          },
          tryIt: {
            prompt: 'You send the same prompt twice to a chatbot that uses a model. Are the two replies always the same? Type yes or no.',
            starter: '',
            rules: [
              { kind: 'contains', value: 'no', says: 'A model chooses likely words, so its replies can differ.' },
              { kind: 'maxWords', value: 2, says: 'It is one word: yes or no.' },
            ],
            expected: 'No. Ask twice and you may read two different replies.',
          },
          exercise: {
            question: 'A customer sends one prompt. How many replies come back?',
            choices: ['None', 'One', 'Ten'],
            correctIndex: 1,
            reason: 'One prompt gets one reply.',
          },
          video: null,
        },
        {
          key: 'it-1-1-5',
          title: 'The limit: what a chatbot cannot do',
          intro:
            'A limit is something a chatbot cannot do. ' +
            'It cannot look anything up, and it cannot do anything in the store. ' +
            'On the screen, its reply still reads smooth and sure. ' +
            'Behind the screen, the model wrote likely words, with no facts from Maple Mart. ' +
            'Technical note: this is a common failure: a sure reply that is wrong.',
          introduces: ['limit'],
          uses: ['chatbot', 'model', 'reply'],
          example: {
            mono: true,
            text:
              'Customer   Where is my order?\n' +
              'Help chat  Orders often arrive in three to five days.\n\n' +
              'The chat did not look at her order. It cannot.\n' +
              'Milo opens the order list and finds it.',
          },
          tryIt: {
            prompt: 'Name one thing Maple Mart’s help chat cannot do for a customer.',
            starter: 'It cannot ',
            rules: [
              { kind: 'contains', value: 'cannot', says: 'It names something the chat cannot do.' },
              { kind: 'containsAny', values: ['look', 'find', 'see', 'open', 'send', 'change', 'know', 'pack', 'bring'], says: 'It names an action, such as look up or send.' },
              { kind: 'minWords', value: 5, says: 'It is a whole sentence.' },
            ],
            expected: 'Yes. A chatbot writes words. It cannot look up or change anything.',
          },
          exercise: {
            question: 'The help chat sounds sure about the opening time. Is it right?',
            choices: ['Yes, sure means right', 'Maybe not: it never saw the store’s hours', 'It is always wrong'],
            correctIndex: 1,
            reason: 'A model writes likely words, so a sure reply can still be wrong.',
          },
          video: null,
        },
        {
          key: 'it-1-1-6',
          title: 'An agent: a helper that does the steps',
          // Animation slot (Pax): on-ramp step 1, the chatbot
          intro:
            'An agent is a helper that does not just answer. ' +
            'It does steps for you: it looks things up and finishes a small job. ' +
            'On the screen, the customer reads the real status of her order. ' +
            'Behind the screen, the agent opened the order list and read it. ' +
            'Technical note: any step can fail, so each one needs care.',
          introduces: ['agent'],
          uses: ['chatbot'],
          example: {
            mono: true,
            text:
              'Customer   Where is my order?\n\n' +
              'The chatbot\n' +
              '  writes a likely answer, and stops\n\n' +
              'The agent\n' +
              '  1. reads her question\n' +
              '  2. looks up her order in Maple Mart’s order list\n' +
              '  3. picks the answer: it left the store today\n' +
              '  4. tells her\n' +
              '  5. writes down what it did',
          },
          tryIt: {
            prompt: 'A customer asks Maple Mart where her order is. Write the first thing an agent does after it reads her question.',
            starter: 'First, it ',
            rules: [
              { kind: 'containsAny', values: ['look', 'open', 'find', 'read', 'search'], says: 'It does a step, not only an answer.' },
              { kind: 'contains', value: 'order', says: 'It names what it looks at: her order.' },
              { kind: 'minWords', value: 5, says: 'It is a whole sentence.' },
            ],
            expected: 'Yes. An agent does the step. A chatbot would only write an answer.',
          },
          exercise: {
            question: 'Which one is an agent?',
            choices: [
              'A helper that writes a likely answer and stops',
              'A helper that looks up the order and tells the customer its status',
              'A page that lists the store’s phone number',
            ],
            correctIndex: 1,
            reason: 'An agent does the steps of a small job, not just an answer.',
          },
          video: null,
        },
      ],
    },
    {
      key: 'it-ch2-a-skill-one-job-written-as-steps',
      title: 'A skill: one job, written down as steps',
      lessons: [
        {
          key: 'it-1-2-1',
          title: 'A tool: something the agent can use',
          intro:
            'A tool is something an agent can use to do a step. ' +
            'Milo’s tools are the order list and the phone. ' +
            'On the screen, the customer sees only the answer. ' +
            'Behind the screen, the agent asks for a tool by name, and the store’s system runs it. ' +
            'Technical note: an agent can use only the tools on its list.',
          introduces: ['tool'],
          uses: ['chatbot', 'reply', 'agent'],
          example: {
            mono: true,
            text:
              'The agent’s tools at Maple Mart\n' +
              '  look up an order\n' +
              '  read the opening hours\n' +
              '  send a message to Milo\n\n' +
              'Not on its list\n' +
              '  give money back',
          },
          tryIt: {
            prompt: 'A customer asks what time Maple Mart opens. Type the tool the agent uses: “look up an order” or “read the opening hours”.',
            starter: '',
            rules: [
              { kind: 'contains', value: 'hours', says: 'It names the tool that reads the hours.' },
              { kind: 'maxWords', value: 5, says: 'It names one tool, not both.' },
            ],
            expected: 'Right tool. The agent reads the hours and does not guess them.',
          },
          exercise: {
            question: 'What is a tool?',
            choices: ['Something the agent can use to do a step', 'A reply the chatbot wrote', 'A customer’s question'],
            correctIndex: 0,
            reason: 'A tool is a thing the agent uses, as Milo uses the order list.',
          },
          video: null,
        },
        {
          key: 'it-1-2-2',
          title: 'A skill: a recipe card for one job',
          intro:
            'A skill is one job the agent knows how to do well, written down as steps, like a recipe card. ' +
            'More skills mean more jobs it can do. ' +
            'On the screen, each return at Maple Mart is handled the same way. ' +
            'Behind the screen, the agent follows the skill’s steps. ' +
            'Technical note: a skill is plain text, so a person can read and correct it.',
          introduces: ['skill'],
          uses: ['agent', 'tool'],
          example: {
            mono: true,
            text:
              'Skill: answer a return question\n' +
              '  1. Ask for the order and the item.\n' +
              '  2. Look up the order.\n' +
              '  3. Tell the customer how to bring or send the item back.\n' +
              '  4. Pass the rest to Milo.\n\n' +
              'The tool is the order list. The skill is the card of steps.',
          },
          tryIt: {
            prompt: 'Write the first step of a skill for this job at Maple Mart: tell a customer where an order is.',
            starter: 'Step 1: ',
            rules: [
              { kind: 'containsAny', values: ['ask', 'look', 'find', 'read', 'open'], says: 'It is a step the agent can do.' },
              { kind: 'contains', value: 'order', says: 'It names the order.' },
              { kind: 'minWords', value: 6, says: 'It is a whole step.' },
            ],
            expected: 'A good first step: clear, small, and written down.',
          },
          exercise: {
            question: 'How is a skill different from a tool?',
            choices: [
              'They are the same thing',
              'A tool is something the agent uses; a skill is the written steps for one job',
              'A skill is a faster tool',
            ],
            correctIndex: 1,
            reason: 'The tool does one action, and the skill says how to do the whole job.',
          },
          video: null,
        },
        {
          key: 'it-1-2-3',
          title: 'Approval: what a person still decides',
          intro:
            'Approval is a person’s yes before something important happens. ' +
            'An agent drafts and answers. ' +
            'A person decides money, signing and anything about a person. ' +
            'On the screen, Milo sees a request with Yes and Not now. ' +
            'Behind the screen, the agent has stopped and waits. ' +
            'Technical note: without his yes, the step does not run.',
          introduces: ['approval'],
          uses: ['agent'],
          example: {
            mono: true,
            text:
              'A customer wants her money back for a coat.\n\n' +
              'The agent\n' +
              '  looks up the order\n' +
              '  drafts a note for Milo: what she bought, and when\n' +
              '  stops\n\n' +
              'Milo\n' +
              '  reads the note and decides\n' +
              '  says Yes or Not now',
          },
          tryIt: {
            prompt: 'The agent at Maple Mart has a request to give a customer her money back. Type who decides.',
            starter: '',
            rules: [
              { kind: 'containsAny', values: ['milo', 'person', 'human', 'staff'], says: 'A person decides about money.' },
              { kind: 'maxWords', value: 8, says: 'It names who decides, in a few words.' },
            ],
            expected: 'Yes. The agent drafts, and a person decides about money.',
          },
          exercise: {
            question: 'Which of these may an agent do alone?',
            choices: ['Give a customer her money back', 'Draft an answer about opening hours', 'Sign a contract for the store'],
            correctIndex: 1,
            reason: 'An agent drafts and answers, and a person decides money and signing.',
          },
          video: null,
        },
      ],
    },
    {
      key: 'it-ch3-agentic-work-step-by-step',
      title: 'Agentic work: step by step, checking as you go',
      lessons: [
        {
          key: 'it-1-3-1',
          title: 'A goal: the result you want',
          intro:
            'A goal is the result you want at the end of a job. ' +
            'An agent needs a clear goal, or it cannot know when to stop. ' +
            'On the screen, the customer says what she wants. ' +
            'Behind the screen, the agent keeps that goal and chooses each step toward it. ' +
            'Technical note: a vague goal is a common cause of wrong steps.',
          introduces: ['goal'],
          uses: ['agent'],
          example: {
            mono: true,
            text:
              'Vague goal   Help the customer.\n' +
              'Clear goal   Tell the customer where her Maple Mart order is, in one message.',
          },
          tryIt: {
            prompt: 'This goal is vague: “Deal with the customer.” Write a clear goal for a customer who asks when Maple Mart opens.',
            starter: 'Tell the customer ',
            rules: [
              { kind: 'containsAny', values: ['open', 'hours', 'time'], says: 'It names the result: the opening time.' },
              { kind: 'minWords', value: 6, says: 'It is a whole sentence.' },
            ],
            expected: 'A clear goal: the agent knows what done looks like.',
          },
          exercise: {
            question: 'Why does an agent need a clear goal?',
            choices: ['So it knows which steps to take and when to stop', 'So it can type faster', 'So the chat looks nicer'],
            correctIndex: 0,
            reason: 'The goal tells the agent what result ends the job.',
          },
          video: null,
        },
        {
          key: 'it-1-3-2',
          title: 'A check: look at each result',
          intro:
            'A check is a look at a result before the next step. ' +
            'Did the step work? Is the result the right one? ' +
            'On the screen, the customer sees none of this. ' +
            'Behind the screen, the agent reads what each tool gave back. ' +
            'Technical note: a wrong result that nobody checks is carried into every later step.',
          introduces: ['check'],
          uses: ['agent', 'tool'],
          example: {
            mono: true,
            text:
              'Step     look up the order in Maple Mart’s order list\n' +
              'Result   no order with that number\n' +
              'Check    the result is empty, so do not guess\n' +
              'Next     ask the customer to read the number again',
          },
          tryIt: {
            prompt: 'The agent looks up an order and nothing comes back. Type what it does next: “guess the status” or “ask for the number again”.',
            starter: '',
            rules: [
              { kind: 'contains', value: 'ask', says: 'It asks, and does not guess.' },
              { kind: 'maxWords', value: 6, says: 'It names one next step.' },
            ],
            expected: 'Yes. The check found an empty result, so the agent asks and does not guess.',
          },
          exercise: {
            question: 'When does an agent check?',
            choices: ['Only at the very end', 'After each step, before the next one', 'Never, to save time'],
            correctIndex: 1,
            reason: 'A wrong result found early does not spread into later steps.',
          },
          video: null,
        },
        {
          key: 'it-1-3-3',
          title: 'A record: every step written down',
          intro:
            'A record is a written list of what happened, kept to be read later. ' +
            'On the screen, Milo opens it and reads each line. ' +
            'Behind the screen, the agent adds a line for every step: what it did and what came back. ' +
            'Technical note: when an answer is wrong, the record shows which step failed.',
          introduces: ['record'],
          uses: ['model', 'agent'],
          example: {
            mono: true,
            text:
              'Record of one job at Maple Mart\n' +
              '  10:02  customer asked where her order is\n' +
              '  10:02  looked up the order: found\n' +
              '  10:02  status read: left the store today\n' +
              '  10:03  told the customer\n' +
              '  10:03  job closed',
          },
          tryIt: {
            prompt: 'The agent told a customer her order left the store today. Write the line it adds to the record.',
            starter: '',
            rules: [
              { kind: 'containsAny', values: ['told', 'sent', 'answered', 'said'], says: 'It says what the agent did.' },
              { kind: 'containsAny', values: ['customer', 'her', 'order'], says: 'It says who or what the step was about.' },
              { kind: 'minWords', value: 4, says: 'It is a whole line.' },
            ],
            expected: 'A good line: what was done, and for whom.',
          },
          exercise: {
            question: 'A customer got a wrong answer yesterday. Where does Milo look first?',
            choices: ['In the record of that job', 'In the text the model learned from', 'Nowhere: it cannot be found'],
            correctIndex: 0,
            reason: 'The record holds every step, so the failed one can be found.',
          },
          video: null,
        },
        {
          key: 'it-1-3-4',
          title: 'Agentic: step by step toward a goal',
          // Animation slot (Pax): the five steps ask, check, decide, act, record
          intro:
            'Agentic means working step by step toward a goal and checking as you go. ' +
            'It is how an agent does a whole job, not just one answer. ' +
            'On the screen, the customer asks once and the job gets done. ' +
            'Behind the screen, five steps run: ask, check, decide, act, record. ' +
            'Technical note: after a set number of tries, it stops and hands over to a person.',
          introduces: ['agentic'],
          uses: ['reply', 'agent', 'approval', 'goal', 'check', 'record'],
          example: {
            mono: true,
            text:
              'A customer asks Maple Mart to take back a lamp.\n\n' +
              '  Ask      the agent reads her message\n' +
              '  Check    it looks up her order and the date\n' +
              '  Decide   it picks the next step: a note for Milo\n' +
              '  Act      it drafts the note and tells her Milo will answer\n' +
              '  Record   it writes down each step\n\n' +
              'The money needs Milo’s approval.',
          },
          tryIt: {
            prompt: 'Type the five steps of agentic work in order, with a comma and a space between them.',
            starter: 'ask, ',
            rules: [
              { kind: 'contains', value: 'ask, check, decide, act, record', says: 'The order is ask, check, decide, act, record.' },
              { kind: 'maxWords', value: 5, says: 'It is the five steps and nothing more.' },
            ],
            expected: 'Yes. Ask, check, decide, act, record: every job, in that order.',
          },
          exercise: {
            question: 'Which is agentic work?',
            choices: [
              'Writing one reply and stopping',
              'Working step by step toward a goal, checking after each step',
              'Doing every step at once with no checks',
            ],
            correctIndex: 1,
            reason: 'Agentic work moves toward a goal in steps and checks as it goes.',
          },
          video: null,
        },
      ],
    },
  ],
  project: {
    key: 'it-simple-project',
    title: 'Run one help-counter job by hand, the way an agent would',
    checklist: [
      'Chose one customer question for Maple Mart’s help chat and wrote it as a clear prompt',
      'Wrote the reply a chatbot might give, and named one limit of that reply',
      'Listed two tools an agent would need for the job',
      'Wrote a skill for the job: three to five steps, like a recipe card',
      'Marked the step that needs Milo’s approval, and said why',
      'Wrote the goal of the job in one sentence',
      'Walked the job through ask, check, decide, act, record',
      'Wrote the record of the job, one line for each step',
    ],
  },
}

/** For each try-it: one input its rules accept and one they refuse. Read by the content test, and by a hint later. */
export const SIMPLE_TRY_SAMPLES: Record<string, { right: string; wrong: string }> = {
  'it-1-1-1': { right: 'Where is my order?', wrong: 'Tell me things' },
  'it-1-1-2': { right: 'How do I return a pair of shoes?', wrong: 'Tell me about returns.' },
  'it-1-1-3': { right: 'A model learned from a great deal of text.', wrong: 'A model learned from Maple Mart’s order list.' },
  'it-1-1-4': { right: 'No', wrong: 'Yes' },
  'it-1-1-5': { right: 'It cannot look up her order.', wrong: 'It is very fast.' },
  'it-1-1-6': { right: 'First, it looks up her order in the order list.', wrong: 'First, it says sorry.' },
  'it-1-2-1': { right: 'read the opening hours', wrong: 'look up an order' },
  'it-1-2-2': { right: 'Step 1: Ask the customer for the order number.', wrong: 'Step 1: Be nice.' },
  'it-1-2-3': { right: 'Milo decides.', wrong: 'The agent decides.' },
  'it-1-3-1': { right: 'Tell the customer what time the store opens on Sunday.', wrong: 'Deal with the customer.' },
  'it-1-3-2': { right: 'ask for the number again', wrong: 'guess the status' },
  'it-1-3-3': { right: 'Told the customer her order left the store today.', wrong: 'Done.' },
  'it-1-3-4': { right: 'ask, check, decide, act, record', wrong: 'ask, act, check, decide, record' },
}
