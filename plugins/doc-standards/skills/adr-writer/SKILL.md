---
name: adr-writer
description: Write, update, or retrofit an architecture decision record (ADR) in the house shape - YAML front matter, a plain-language summary a non-engineer can act on (the problem, the options and what each costs, the recommendation, the decision needed and who owes it), then the full engineering detail below. Use on "write an ADR", "decision record", "record this decision", "add a summary to this ADR", "retrofit the ADRs", "update ADR-nnn", when a fix, bug investigation, feature design, or PR chose between two or more real options, or whenever creating or editing a file named ADR-*.md or anything under a docs/decisions/ folder. Runs a qualifying test first and pushes back when the work doesn't need an ADR.
---

# Architecture decision records

An ADR has two readers. The first wants to know what is being decided, what it costs, and who
has to answer, and they stop reading after the summary. The second is the engineer who has to
build it or revisit it later, and they need every measurement and file reference. One file
serves both: the summary on top, the engineering detail below, and nothing in the summary that
the detail does not back up.

Read `${CLAUDE_PLUGIN_ROOT}/references/language.md` before writing a word. It holds the voice,
precision, and formatting rules and the banned list.

## Does this need an ADR?

Run this test before writing a new ADR. It doesn't apply to updating or retrofitting one that
already exists.

**The test: did this work reject an option someone might suggest later?** An ADR exists so
nobody has to re-argue a choice. If there was no choice, there's nothing to re-argue.

It qualifies when at least one of these is true:

- Two or more real options were weighed, and the one chosen has a cost someone could object
  to: patch the prompt or add a code check, retry or fail loud, live lookup or stored snapshot.
- It sets a rule other work has to follow: who owns a column, which source wins, what a field
  means.
- It is hard to undo: a format change to stored data, a backfill, a schema other teams read.
- It spends money or changes a run rate that someone has to approve.

It doesn't qualify when the fix had one correct answer: a missing grant, a typo in a path, a
wrong join key, a dependency bump, a config value that was wrong. Those belong in the commit
message, the PR description, and the ticket.

When the work doesn't qualify, push back before writing anything. Say which part of the test
it fails, in one or two sentences, and name where the record belongs instead. For example: "This
fix had one right answer (the role was missing a grant), so there's no rejected option to
record. The PR description and the ticket cover it." If the person still wants an ADR, write
it. They may know about an option that wasn't mentioned, and that option is worth asking about
before you start.

When the work qualifies, say which part of the test it meets in one sentence, then write it.

## Where ADRs live

- The folder is `docs/decisions/` at the repo root. In a repo that holds several
  self-contained projects, each project keeps its own `docs/decisions/` at the project's root
  (for example `cortext/cortex-transportation-risk/docs/decisions/`).
- Files are named `ADR-nnn-short-kebab-title.md`, numbered from `ADR-001` with three digits.
  The next number is one past the highest in that folder. Numbers are never reused, even when
  an ADR is rejected.
- The folder holds a `TEMPLATE.md`, copied from `references/TEMPLATE.md` in this skill. Create
  the folder and the template if they are missing.

## The front matter

A YAML block at the very top of the file. Every key is present on every ADR. A value that
doesn't apply yet stays empty, never invented.

| Key | Holds |
|---|---|
| `adr` | The number, as an integer |
| `title` | The decision stated as a choice, same as the H1 |
| `date` | The date it was proposed, `YYYY-MM-DD` |
| `status` | Exactly one of `PROPOSED`, `DECIDED`, `REJECTED`, `SUPERSEDED` |
| `decider` | The one person who owns the yes. If two people really own two parts, write a list with each person's part, and consider whether it is two ADRs |
| `recorded_by` | Who wrote it |
| `ticket` | The id or URL of the ticket tracking the work (Jira, Linear, GitHub issue) |
| `validation_by` | The date of the check that says whether the decision worked, from question 5 of the decision check. When it passes, the result goes in `## Changes` |
| `decided` | Empty until decided. Then the date and where it was decided: `2026-10-07, architecture review` |
| `reversible` | `yes`, `no`, or `partly`. A `no` tells the reviewer to look hard |

The status stays one word. Anything longer (cleared to scope, built on dev, waiting on the sponsor)
goes in the summary's "Where it stands" line, where a sentence has room.

## The summary

Directly under the H1, before any engineering. About 300 words, written so a non-engineer can
follow it: no table names, file paths, or line numbers here, except a system name the reader
needs to recognize. Sections, in order:

1. **Where it stands.** One or two sentences: the status in words, what is built or deployed,
   and what the ADR is waiting on.
2. **The problem.** What is broken or missing, and what it costs, with the one or two numbers
   that prove it. Every number names what it counts.
3. **The recommendation.** For a proposed ADR, what the author recommends and what it takes to
   do it. For a decided one, what was chosen. Include the cost of the chosen route, not only its
   gains.
4. **Other options.** A two-column table, `Option | Trade-off`, one row per alternative from
   the Options section below, waiting and doing nothing included. Each trade-off says what the
   option gains and what it gives up, in one or two sentences.
5. **Decision needed.** Each open decision on its own line: who decides, and what they are
   choosing between. On a decided ADR with nothing open, this section says "Nothing open."

Every claim in the summary has to trace to the detail below. If the detail doesn't support it,
fix the detail or drop the claim.

## The engineering detail

Below the summary, under `## Detail`. This is the author's full argument, and the summary does
not replace it. Keep the team's existing sections: the five-question decision check, Context,
Options (with the Gains, Costs and risks, Priced? table), Decision, and Consequences and check.
Measurements, queries, file references, and fixtures all belong here.

## Changes

The last section of every ADR is `## Changes`, a dated list with one line per change.

- The summary and the front matter always describe the current state. When something changes,
  rewrite them.
- Before the first review, edit the detail freely. Git keeps the history.
- After review starts, the detail is appended to, not rewritten. New facts, answers from a
  decider, and amendments go in as a dated section at the bottom of the detail
  (`## Amendment 2, 2026-10-08: two guards from the first production night`).
- Every change after the first review gets a line in `## Changes`: the date, what changed, and
  the section it went into. Changing the status or a front matter value counts.
- Reversing a decided ADR takes a new ADR. Set the old one to `SUPERSEDED` and name the new one
  in its "Where it stands" line and its change log.

## Modes

**Write a new ADR.** Copy `references/TEMPLATE.md` into the folder under the next number. Draft
the detail first: the five questions, the context, and the options with their costs. Then write
the summary from the detail, because the summary is a translation of the detail. Ask the author
for any number the options are missing a price for, rather than writing around it.

**Update an ADR.** Follow the Changes rules above. Then re-read the summary against the new
state, and make sure "Where it stands" and "Decision needed" are true today.

**Retrofit an existing ADR.** Add the house shape to an ADR written before it existed, without
changing what the ADR says.

1. Read the whole file, including every amendment and appended answer. The summary describes
   the current state, which often lives in the last amendment, not in the original Decision
   section.
2. Move the old status line into YAML front matter. Map a long status onto the four words
   (cleared to scope is `PROPOSED`, built or done is `DECIDED`), and carry the rest of the old
   status text into "Where it stands" so no fact is lost. Keep the decider the file names, even
   when it lists several people. Fill `validation_by` from the dated check in question 5. Leave `ticket` and `reversible`
   empty unless the file states them, and list the empty ones for the person who asked.
3. Write the summary under the H1.
4. Put the original body below a `## Detail` heading, word for word, with its own headings left
   as they were.
5. Add `## Changes`. Seed it with one line per dated amendment already in the file, then a line
   for the retrofit itself: `2026-10-15: added front matter and summary. No change to the decision.`
6. Check every claim in the summary against the body. When the body contradicts itself (an
   amendment superseded the original decision), the summary follows the latest amendment and
   says so.

## Before it goes out

1. Every front matter key is present, and the status is one of the four words.
2. The summary reads on its own to someone who has never seen the project, and every number in
   it names what it counts.
3. Every claim in the summary traces to the detail.
4. "Decision needed" names a person for each open decision.
5. Check the prose against `${CLAUDE_PLUGIN_ROOT}/references/language.md`.

## What this skill does not own

- `executive-brief-writer` owns asks to a sponsor: funding, charters, phase gates. If an ADR's
  open decision is a spend for an executive, the ADR names it, and the ask itself is a brief.
- `primer-writer` turns a whole ADR into a primer for readers outside the team.
- `technical-doc-writer` documents how the system works once the decision is built.
