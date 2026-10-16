---
name: primer-writer
description: Turn a long engineering doc, design doc, or white paper (usually written by someone else) into a short primer that executives and non-technical teammates can read. The primer leads with the point in plain language, uses a diagram, table, or chart only where the source earns one, traces every claim to a section of the source, and says what it leaves out. Use on "make a primer of this", "summarize this doc for leadership", "explain this white paper to non-engineers", "exec-friendly version of", "too long for the exec team, shorten it", or any request to translate an existing technical document for a non-technical reader. Not for documents that ask someone to decide something the author owns; those are executive-brief-writer.
---

# Primers of someone else's document

A primer is a translation. The source doc belongs to its author, and the primer's job is to
let a reader who will never open the source know what it says, what it means for them, and
where to look if they need more. The primer's author is the translator, not the owner.

That sets the one rule everything else follows: **the primer never says anything the source
does not.** No recommendation the source does not make, no commitment the source does not
make, no figure the source does not contain, no opinion of the translator's. When you think
the source is wrong or missing something, tell the person who asked for the primer in chat.
It does not go on the page.

If the person asking wrote the source themselves and wants to ask a reader to decide
something, stop and use `executive-brief-writer` instead. That skill owns asks and recommendations.

## Step 1: Get the source text

| Source | How |
|---|---|
| Markdown or text file | Read it. |
| Word, PowerPoint, Excel, RTF | `file-converter` skill to markdown. |
| PDF | `pdf` skill to extract text and tables. Read diagrams and figures from rendered pages yourself, never from extracted text. |
| Wiki page (Confluence, Notion) | That wiki's connector, for example `getConfluencePage`. |
| A link you cannot open | Ask for the file. Do not primer a document from its title. |

Keep the extracted text open for the whole job. Note the source's section headings or page
numbers now, because every claim in the primer cites one.

## Step 2: Establish the reader and what they need

Ask the person who wants the primer, unless they already said. Two questions:

1. **Who reads it?** A name or a role: the CFO, the operations leads, the whole company.
2. **What do they need from it?** Pick one:
   - **Understand it.** They need the idea, why it exists, and what changes.
   - **Approve something.** The source asks for a decision. The primer states the ask exactly
     as the source states it, with the source's own numbers, and nothing more.
   - **Know their part.** The source changes their work. The primer leads with what they will
     do differently and when.

The answer picks what goes first. Write it at the top of your working notes and check every
section against it: if a section does not serve that reader's need, cut it.

## Step 3: Draft to the shape

Read `${CLAUDE_PLUGIN_ROOT}/references/language.md` before writing a word.
It holds the voice, precision, and formatting rules and the banned list, and it applies
whether or not the Vox Calibre output style is installed.

The order:

1. **Title.** Name the document being explained: "Primer: the billing data model refactor",
   never a narrative headline.
2. **The point, in plain language.** Three to five sentences a reader could repeat to someone
   else. No schema names, table names, or pipeline nouns here (executive-brief-writer rule 22). This
   section fits on one screen with room to spare.
3. **What it means for you.** Written to the need from step 2. For "know their part", this
   is a numbered list of what changes for the reader and when. For "approve something", it
   is the source's ask in the source's words.
4. **How it works.** The body. Sentence-case headers, one idea per section. Each section
   answers a question the reader would ask, and the header can be that question.
5. **What this primer leaves out.** A short list naming the source sections that were
   compressed or skipped, and who would need them ("Section 6, the load-order rules, matters
   only to engineers changing the pipeline"). This is required. A reader who knows what was
   skipped can trust what was kept.
6. **Source.** A link to the source document, its author, its version or date, and the date
   the primer was written.

**Prose that enumerates becomes a list.** When a paragraph walks through several things
(problems, options, steps, findings, consequences), turn it into a bulleted or numbered list
with a short lead-in sentence and one item per thing. This holds in every section, including
the point. Readers of a primer skim, and a list is what survives a skim. Number the items when
the order is real or the lead-in counts them ("Two problems follow"); otherwise use bullets.

Length target: the point and what-it-means sections fit on one screen. The whole primer is
two printed pages at most. If it runs longer, the primer is restating the source instead of
translating it: cut detail and add it to "What this primer leaves out".

### Visuals

Every visual earns its place by doing something prose cannot. Decide per section:

| The source describes | Use | Hand off to |
|---|---|---|
| A flow, a pipeline, a sequence of steps, or an architecture | A diagram | `archify` |
| Enumerable facts: options, components, owners, before and after | A table | Write it inline |
| Real numeric data the source measured: costs, volumes, durations over time | A chart | `dataviz` |
| An idea, a reason, a trade-off | Prose | Nothing |

Rules for visuals:

- A chart needs real numbers from the source. Never chart an estimate as if measured, and
  never chart numbers you derived.
- A diagram shows only boxes and arrows the source names. Use the source's names for them.
- One diagram is common, two is the ceiling for a two-page primer.
- archify's HTML carries its own fixed colors and fonts, so it does not follow a published
  page's light and dark themes. For a published page, use archify to settle and validate the
  flow, then draw the inline SVG with the page's color tokens (`var(--ink)`, `var(--accent)`
  and the rest), in one column so it stays legible at phone width.
- A scaled SVG shrinks its text with it, so a 640-unit-wide chart has about 8px labels on a
  phone. For a simple bar comparison, draw the bars in HTML so labels keep their real size.
- Every visual gets a caption that says what the reader should take from it, plus the source
  section it came from.

## The rules

These are executive-brief-writer's rules applied to translation. The full text and the incident behind
each one is in `${CLAUDE_PLUGIN_ROOT}/skills/executive-brief-writer/SKILL.md`; the numbers below match it.

1. **Every figure carries its source** (rule 1). In a primer the source is the document
   section: `$47,300 (source §4.2)`. You do not re-measure another author's figures; you
   carry their date with them. If the source gives no date for a figure, say so.
2. **Mark every estimate** (rule 2). If the source calls it an estimate, projection, or
   target, the primer does too, with the same marker every time.
   When you know a source figure is disputed (a review has found it wrong, and the source
   hasn't been corrected), keep the source's figure and mark it: "(projection, under review)",
   with one line saying who raised the correction and when. Never swap in the corrected
   number, because the primer has to match its source.
3. **No claimed gain without its baseline** (rule 5). If the source claims an improvement
   with no baseline, the primer says the source gives no baseline. It does not invent one.
4. **Adjectives never stand in for measurements** (rule 6). "Faster" becomes the source's
   number, or comes out.
5. **Use the team's vocabulary** (rule 19). Keep the source's names for systems, tables,
   and steps. Define each in plain words the first time it appears. Do not rename it to
   something clearer.
6. **Verify claims against the source, not your summary** (rule 21). Compression is where
   errors enter. Check the finished primer line by line against the source text, not against
   your notes.
7. **Plain language up top** (rule 22). No schema, table names, or pipeline nouns in the point
   or what-it-means sections.
8. **Translator, not owner.** No recommendation, commitment, risk rating, or opinion the
   source does not state. Attribute judgments to the source's author: "The author recommends
   option B", never "Option B is better". If the source leaves a question open, the primer
   says it is open.

## Fidelity check

Do this before the primer goes anywhere. It is the step that makes a primer trustworthy.

1. List every claim and every figure in the primer.
2. Next to each, write the source section it came from.
3. Anything without a section comes out, or goes to the person who asked as a question.
4. Re-read each figure against the source text. Same number, same unit, same date, same
   qualifier ("estimated", "at peak", "per month").
5. Read the "What this primer leaves out" list against the source's table of contents. Every
   source section is either reflected in the primer or named there.

Keep the claim-to-section list. Put it in the published page as a collapsed provenance
section, or attach it when the primer goes out as a document.

## Output

When the output is a published page, use the house layout in
`${CLAUDE_PLUGIN_ROOT}/skills/executive-brief-writer/references/artifact-layout.md`. Map the primer onto
it this way:

- **Masthead.** Kicker `PRIMER`, the title, a standfirst that is the point in one sentence,
  and a metadata strip with prepared-for, source document and author, primer date.
- **Gutter labels** name each section's job: "The point", "What changes for you",
  "How it works", "Left out", "Source".
- **Figure strip** only when three or four of the source's figures are the point.
- **Provenance drawers** hold the claim-to-section list from the fidelity check.
- Skip the ask card unless the reader's need is "approve something". Then it holds the
  source's ask verbatim.

For a Word document or Confluence page, keep the same section order and headings.

## Before it goes out

1. The fidelity check is done and every claim has a section.
2. The point and what-it-means sections fit on one screen. The whole primer is two pages at
   most.
3. Every visual has a caption and a source section, and none of them is decoration.
4. Run `design-anti-patterns` on a published page.
5. Check the prose against `${CLAUDE_PLUGIN_ROOT}/references/language.md`: the banned list, whole sentences, and
   every enumerating paragraph turned into a list. Then run `humanizer`.
6. Offer to send the primer to the source's author before it circulates. They are the one
   person who can catch a mistranslation.

## What this skill does not own

- `executive-brief-writer` owns documents that ask someone to decide something the author owns.
- `archify` draws the diagrams, `dataviz` draws the charts.
- `file-converter` and `pdf` get the text out of the source.
- `ground-check` is for figures the author measured. A primer cites the source's figures
  instead.
