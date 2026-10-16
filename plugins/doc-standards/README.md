# doc-standards

Writing standards for documents, packaged so Claude Code follows them for you. One
plugin holds four skills, one for each kind of document, and all four write in the same house
language.

| Skill | What it writes | For |
|---|---|---|
| `technical-doc-writer` | Runbooks, READMEs, pipeline and architecture docs | Engineers who run the system, and the AI agents that help them |
| `primer-writer` | A short primer of someone else's long engineering doc or white paper | Executives and non-technical teammates who need to understand it |
| `executive-brief-writer` | Project charters in a phase-gate format, decision briefs, proposals, funding asks, pilot readouts | A named sponsor who has to decide something |
| `adr-writer` | Architecture decision records: front matter, a plain-language summary of the problem, options, recommendation and decision needed, then the engineering detail. Also retrofits older ADRs | The person deciding, and the engineer who builds or revisits it |

## Getting started

If you've already added this marketplace for another plugin, skip the first line.

1. In Claude Code, type these one at a time:

   ```
   /plugin marketplace add mgstegmaier/claude-plugins
   /plugin install doc-standards@mgstegmaier
   ```

   If Claude Code says `Run /reload-plugins to activate`, type that too.

2. Ask for what you're writing, in your own words. Claude picks the right skill:

   ```
   write a runbook for restarting the nightly job
   make a primer of this design doc for the operations leads
   write the POC charter for the submission summary project
   draft a decision brief for the VP on the retrieval pilot
   write an ADR for switching the Excel converter to delimited output
   add the summary section to ADR-019
   ```

   You can also load a skill by name, for example `/doc-standards:primer-writer`.

3. For a primer, attach or link the source document (Word, PDF, markdown, or a wiki page
   such as Confluence). Claude asks who will read the primer and what they need from it: to understand it,
   to approve something, or to know their part. The primer comes back with a "What this
   primer leaves out" section and a link to the source, and every figure in it cites the
   source section it came from. Send it to the source's author before it circulates. They're
   the one person who can catch a mistranslation.

4. For a charter or brief, Claude asks which format applies if it can't tell, then works
   through the sections with you. It asks for numbers it doesn't have rather than writing
   around them. That's the intended behavior.

5. For an ADR, Claude puts it in `docs/decisions/` (at the repo root, or at a project's root in
   a repo that holds several projects) as `ADR-nnn-short-title.md`, numbered from `ADR-001`. The
   top of the file is YAML front matter (status, decider, ticket, the date we check whether it worked, when and
   where it was decided, whether it can be reversed) and a summary short enough to read between
   meetings. The engineering detail goes below it, and a dated `Changes` list closes the file.

## One language for all four

`references/language.md` holds the voice, precision, and formatting rules and the banned
word list. Every skill reads it before drafting, so a runbook, a primer, and a charter sound
like the same team wrote them. The rules come from the Vox Calibre output style in this
marketplace, copied so they apply even when that plugin isn't installed. When the output style
changes, update `language.md` to match.

## What the executive brief writer changes

| Without it | With it |
|---|---|
| "Manual review is slow" | "60 minutes of document review before the reviewer's judgment begins, measured 2026-09-09" |
| A risk list | A risk beside its mitigation, and the one unquantified item marked open |
| A cost table | A cost table, what the columns are not, and the existing line the spend acts on |
| "Approve this" | Approval, plus two hours of a named domain expert's time in week 2 |
| Success measures written at the readout | Thresholds with targets written before the work, and the conditions that would make us stop |
| Numbers carried over from an older document | Numbers re-measured the day the brief ships, each with its query in an appendix |

## Where the rules came from

The charter format comes from a working phase-gate process (POC, Pilot, Production). If your organization has its own charter template, its row labels win.
Its Concerns row, where you write each objection in the approver's voice and answer it under
`Response:`, is the strongest device in the format, and the skill treats it as required.

The rules about figures and honesty come from one decision brief that went through eight
rounds of correction in a single session. Two of four
headline figures were stale or wrong at ship time, one by roughly 2x, and both were caught
only because someone asked whether the numbers were grounded. Two predictable misreadings of
the same cost table happened within an hour. Every rule traces to something that went wrong.

The primer rules were tested on two real documents: an architecture decision record about
Excel extraction and a production architecture doc for an AI pipeline. The fidelity
check caught four claims in the first draft that went past what the source said.

## What it does not do

It calls other skills rather than repeating them: `ground-check` verifies figures and writes
the provenance appendix, `archify` draws diagrams, `dataviz` draws charts, and `humanizer`
makes the final pass on published prose.
