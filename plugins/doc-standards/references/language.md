# Language rules for doc-standards

Read this before drafting. These are the voice, precision, and formatting rules from the
Vox Calibre output style (`plugins/vox-calibre/output-styles/vox-calibre.md`), copied here so every
document this plugin writes reads the same whether or not the person running it has that
plugin installed. All three skills read it: `technical-doc-writer`, `primer-writer`, and
`executive-brief-writer`. The chat-only parts are left out. When the output style changes, update this file to match.

Write like an experienced colleague explaining something they know well: plainly, accurately,
and like a person. When two rules collide, clear beats warm, and warm beats stiff.

Write for the person who finds this six months from now with no context. The one test a
reviewer needs: could that person act on this without asking anyone?

## Voice

- Talk to the reader as "you". Use "we" only for the team you speak for. In a primer, the
  source's author is named ("Charles proposes"), never folded into a "we" the translator
  doesn't speak for. Passive, agentless prose is how
  writing stops sounding human.
- Use contractions: "don't", "it's", "you're". Prose with no contractions reads robotic.
- Vary sentence length. Keep the average short, but let an occasional longer sentence carry a
  connected thought to its end. A wall of uniformly short sentences reads like a telegram.
- Write whole sentences. Every sentence gets a subject and a verb. Verbless fragments, dropped
  subjects, a colon or a comma standing in for a verb or a conjunction, a stat phrase hung off
  the end of a clause, and an action turned into a noun all read as someone economizing on
  words instead of a person talking. They creep in when you condense, which is most of what a
  primer does. Keep the short sentences and make them complete.
  - "The bigger issue: the CRM writes a placeholder." becomes "The bigger issue is that the CRM
    writes a placeholder."
  - "The real ID is in CUSTOMER_REGION_ID, roughly 2,500 rows." becomes "The real ID sits in
    CUSTOMER_REGION_ID on roughly 2,500 rows."
- Warm means grounded, not chirpy. No exclamation points, no jokes, no cheerleading.
- Prefer positive phrasing. Say what to do rather than what to avoid, when both are available.
- Tone is the docs tone: neutral and direct, human, nothing cute near a command.

## Clarity

- Use the active voice and name the actor: "the script writes the file", not "the file is
  written".
- Choose short, everyday words. Use a technical term only when it's the exact name of the thing.
- If a sentence needs a second read, split it. One topic per paragraph. Front-load the point.
- Use a number, not a vague adjective: "failed 3 of the last 4 runs", not "failing frequently".
- Every percentage, ratio, and count names the population it measures and the thing being
  counted, in the same sentence, with a plain noun. "The columns run 99.6 percent" leaves the
  reader asking "percent of what". Write "99.6 percent of the values in those columns are nine
  digits".
- One name per thing. Components, systems, and steps keep the same name everywhere in the
  document, and that name is the one the team already uses (executive-brief-writer rule 19).
  Ordinary verbs can vary;
  identifiers can't.
- When content is enumerable (problems, options, steps, findings), use a bulleted or numbered
  list, with a short lead-in sentence. Number only a real sequence or a counted set the prose
  refers to ("two problems follow"). Save paragraphs for reasoning and narrative.

## Precision

These rules spend words so the reader doesn't spend attention.

- Define a term the first time it appears, in the sentence where it appears. Don't push
  definitions to a glossary or a later section.
- Carry the question with the answer. A heading like "The three answers" forces the reader to
  reconstruct the question. Write "Should the three repos merge into one? No, keep them
  separate."
- A reference is not a fact until you say what it is. On first mention, give any prior
  decision, meeting, commit, ticket, or file one clause saying what it was. A bare date is the
  worst version of this, because it looks specific while carrying nothing. Never let a date be
  the only identifier of an event.
- Instructions are imperative, one action per step. Say where before what: "In Settings, click
  Publish". Name the place, don't point at it.
- Never write "simply", "just", "easy", or "please" in an instruction.

## Formatting

- Bold carries meaning or it goes. No bold label on every item of a list.
- Headings use sentence case, with no emoji and no arrows. The document's title appears once.
- A heading is not restated by the first sentence under it. Start with the content.
- A title tells a stranger what the document is and whether they need it. If the title could
  fit five other documents, rewrite it.
- Tense follows the document. Docs, runbooks, and primers describe current behavior in the
  present tense. Change logs, readouts, and a source's history use the past tense.

## Documenting people

Documents persist, and the people they describe may read them.

- Describe observations, not character.
- Name the need or the process gap, not the person's failing.
- No attributed motives, no frustration language, no sides. Record a disagreement as an open
  question with an owner.

## Banned words and phrases

The test behind all of it: every sentence you keep gives the reader something they didn't
already have.

- These words: delve, vibrant, crucial, pivotal, testament, landscape, showcase, elevate,
  seamless, robust, leverage, utilize, streamline, comprehensive, ensures ("this ensures robust
  handling").
- These phrases: "note that", "it's important to", "it's worth noting", "as mentioned above",
  "please note".
- Restatement: any sentence that only says again what the previous sentence said. Cut the
  second one.
- Plain-word swaps: "wrong", not "suboptimal"; "use", not "utilize"; "before", not "prior to";
  "to", not "in order to"; "handle", not "navigate"; "explain", not "unpack".
- Business jargon: "lean into", "double down", "deep dive", "circle back", "moving forward",
  "game-changer". Say what you mean instead.
- A dash aside, written with an em dash or with " - ". Use a comma, parentheses, or a new
  sentence. A source's own title keeps its punctuation.
- Binary contrasts: "X isn't the problem. Y is.", "The answer isn't X. It's Y.", "It's not X.
  It's Y.", "not just X, it is Y", "no setup needed". State Y directly. Keep a contrast only
  when the reader actually believes X.
- Rhythm is not information. Parallel adjectives doing rhythm work ("fast, reliable,
  affordable") tell the reader nothing. Keep the one that matters, or make a real list.
- Assistant phrases: "Great question", "I hope this helps", and other upbeat closers.
- Trailing "-ing" analysis clauses: "..., highlighting the importance of X". End the sentence.
- Copula avoidance: "serves as", "stands as", "boasts". Write "is" and "has".
- Vague attributions: "experts say", "industry observers note". Name the source or cut the
  claim.
- False ranges: "from dashboards to pipelines" as fake breadth. Name the actual items.
- Hedging stacks: "may potentially", "could possibly". Hedge once or state it plainly.
- Intensifiers: "genuinely", "honestly", "truly", "really", "actually" (as emphasis),
  "fundamentally", "literally". If a claim needs one to land, make it more specific.
- Signposting: "Let's dive in", "In this section, we will". Start with the content.
- Throat-clearing: "Here's the thing", "Here's what/why", "It turns out", "The truth is",
  "Let me be clear". Start with the point.
- Generic positive conclusions: "an exciting step forward". End when the information ends.
- Deep-sounding sayings: "the real question is", "at its core", "what really matters", "the
  heart of the matter". Say the specific claim instead.
- Vague declaratives: "The implications are significant", "The stakes are high". Name the
  implication, or cut the sentence.
- Arguing with no one: "to be clear", "don't get me wrong", "a tempting approach would be".
  Cut the objection nobody raised.
- Vague connection: "associated with", "linked to", "tied to". Name the relationship, or say
  the source doesn't give one.
- False agency: "the data tells us", "the decision emerged". Name who read the data or who
  decided. Software doing literal work ("the job writes the table") is fine.
- Knowledge-limit disclaimers and the guesses that follow them: "based on available
  information", "likely began", "it is believed that". Say what the source doesn't show, then
  stop.

## Never simplify

Keep these exact: commands, file paths, code identifiers, error messages, URLs, and quoted
text from the source. The language rules apply to prose only.

Run `humanizer` as the final pass on anything that circulates outside the team. If it isn't
installed, check against Wikipedia's "Signs of AI writing" and say the skill wasn't available.
