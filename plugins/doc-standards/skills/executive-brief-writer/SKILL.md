---
name: executive-brief-writer
description: House standard for writing to executives: project charters in a phase-gate row format, decision briefs, proposals, funding asks, pilot readouts, and phase-gate readouts. Use whenever the audience is a sponsor or above and the document asks someone to decide something. Triggers on "write a charter", "brief for the VP", "proposal for leadership", "exec summary of", "make the case for", "funding ask", "POC readout", "phase gate", or any artifact whose stated audience is an executive.
---

# Writing to executives

An engineer reading a runbook fails by not being able to run it. An executive reading a
proposal fails a different way: they approve something they misunderstood, or they decline
something worth doing because the document never said what good would look like. This skill
exists for that second failure.

Two output formats share one rule set.

| You are writing | Use | Reference |
|---|---|---|
| A project charter going through a phase gate (POC, Pilot, Production) | The charter rows | `references/charter.md` |
| Anything else that asks one named person to decide: proposal, funding ask, pilot readout, one-off decision brief | The decision-brief spine | `references/decision-brief.md` |

When you cannot tell which, ask. A charter enters a governance process and has approvers; a
brief goes to a person.

## Before you draft: whose desk is this from

Establish two things with the author and keep them in view for the whole draft.

1. **What the author owns.** Their function, and the systems, budgets and people they can
   commit without asking anyone. For an infrastructure and platform owner that is the
   pipelines, the warehouse spend, their own hours, and their team's. It is not a business
   team's time, not a business unit's process, not another function's roadmap.
2. **Who the reader is to the author.** A sponsor who can grant things the author cannot is a
   different reader from a peer who can only agree.

Everything in the document then sits inside that boundary or is routed across it on purpose.
Getting this wrong is not a tone problem. A brief that commits another function's people
reads as though a different person wrote it, and the first question in the room goes to
somebody who is not there.

Read `${CLAUDE_PLUGIN_ROOT}/references/language.md` before drafting. It holds the house
voice, precision, and formatting rules and the banned list that every skill in this plugin
follows, whether or not the Vox Calibre output style is installed. Where it overlaps the
language rules below (18 to 22), the rules below are the executive-specific versions and take
precedence.

When the output is a published page rather than a document, `references/artifact-layout.md`
has the house layout. Use it so a brief is not
redesigned from nothing every time.

## What this skill does not own

Call these rather than repeating them.

- `ground-check` verifies figures and writes the provenance appendix. Run it before the
  document goes out. This skill tells you which figures need it; that skill checks them.
- `humanizer` is the final de-AI pass on any published text.
- `technical-doc-writer`, in this plugin, owns engineer-facing documentation. A charter is
  not a design doc.
- `primer-writer`, in this plugin, owns primers: translating someone else's long engineering doc or white paper
  for executives and non-technical readers. A primer asks nobody to decide anything the
  author owns, so these rules for asks and recommendations do not apply to it.
- `chatify` owns the chat message that announces the document.
- `artifact-design` owns design judgment when the output is an artifact.
  `references/artifact-layout.md` is the house starting point it works from.

## The rules

These hold in both formats. Each one exists because something went wrong without it.

### Numbers

1. **Every figure carries its source, and gets re-measured the day the document ships.**
   A number is true as of the query that produced it, not as of the plan you copied it from.
   Write it as `$47,300 · measured 2026-09-09` and let `ground-check` trace it.
2. **Mark every estimate.** An estimate sitting unmarked beside a measured number reads as
   measured. Use `(estimate)` or `(to be validated)` and keep the same marker throughout.
3. **Anchor new spend against the line it acts on.** "$115/month" decides nothing.
   "$115/month against a $2,150/month line" decides something.
4. **State what the numbers are not.** Predict the misreading and answer it under the table.
   Two real ones from a single cost table: a reader took option-vs-option columns as
   before-and-after, and took a one-time line as a subset when it covered the whole backlog.
5. **No claimed gain without its baseline.** If there is no baseline, say the phase
   establishes one, and make that a deliverable.
6. **Adjectives never stand in for measurements.** "Slow" is not a finding. "60 minutes of
   document review before the reviewer's judgment begins" is.

### Honesty

7. **Risks, assumptions and unknowns are three separate lists.**
   - A risk is a known failure mode. It never appears without its handling beside it.
   - An assumption is something you are proceeding as if true, and someone else could
     falsify. List it so they can.
   - An unknown is a number you do not have.
   Blended together, the unknowns hide inside the handled items and read as handled.
8. **Exactly one unknown is marked load-bearing.** Flagging everything flags nothing.
9. **Name your own kill conditions.** State what result would make you stop, and say plainly
   that stopping is an acceptable outcome. Approvers read this as credibility, not
   hedging, and it is often a charter's strongest passage.
10. **Name rejected alternatives with their price.** "We are not using the Box connector
    ($8,400 to re-parse)" is what proves the chosen path was chosen, not defaulted into.

### Structure

11. **Write a Concerns section, in the reader's own words.** Take the objection your audience
    will raise, write it as a question in their voice, and answer it under `Response:`.
    Do this for the four or five objections you expect. An unanswered objection becomes a
    meeting; an answered one becomes a decision. This is the single most valuable device in
    the charter format.
12. **Say what is out of scope by name.** Out-of-scope items prevent more rework than
    in-scope items create.
13. **Deliverables and success measures are different sections.** A deliverable is a thing
    that exists at the end. A success measure is a threshold that was met, with a target
    column. Write success measures before the work starts.
14. **The ask names a human commitment, not only an approval.** Approval is the easy half. A
    named person's hours is the half that blocks delivery and the half authors forget to
    request. In a charter that is the RACIQM grid; in a brief it is a sentence.
15. **Ask for what you own. Route what you do not.** An ask that crosses out of the author's
    mandate is not written as a request the author is making. Name the need, name whose call
    it is, and hand it to the reader when the reader is the person who can grant it: "this
    needs a domain expert's judgment on which output is better, which is your call to make,
    not mine to ask for." Same information, and it does not put the author's name on a
    commitment they cannot deliver. If a whole workstream sits outside the mandate, it is a
    dependency with a named owner or a separate document with a different author, never a
    silent absorption into this one.
16. **Open with the recommendation, labeled.** The charter format writes
    `Our recommendation is:` in the Purpose row. Do the same. A reader who stops after one
    paragraph should still know what you want.
17. **Revision history lives in the source plan, never in the document.** The document is
    always current.

### Language

18. **One author, and the author can answer for every line.** Read the finished document as
    if you are standing in the room alone with it. Any sentence you would have to attribute
    to someone else, about another function's workflow, another team's roadmap, or a
    business value you did not measure, either carries that attribution by name or comes
    out. Write "my time" for your own hours and reserve "we" for the team you actually
    speak for. An institutional "we" is how a brief quietly claims a mandate it does not
    have.
19. **Use the team's vocabulary, not a clearer word you invented.** "Passage table" was
    coined for readability and had to be reverted to "chunk table", the term already in the
    team's speech and in the wiki. A clearer word nobody else uses costs more than the
    jargon it replaced.
20. **Name the document, do not narrate it.** "Search and retrieval over submission
    documents", not "The AI is reading half the file cabinet".
21. **Verify claims about the system against the source, not against your own summary.**
    Compression is where the error enters. One standfirst claimed documents are read
    alphabetically up to a 30K cap; the cap belonged to a different call that is
    deliberately not alphabetical. The plan was right and the one-sentence version was wrong.
22. **Plain language in the Purpose row.** No schema, no table names, no pipeline nouns above
    the Architecture row.

## Banned

- Adjectives where a measurement belongs.
- An unmarked estimate beside a measured number.
- A risk with no mitigation next to it.
- A recommendation with no rejected alternative.
- An ask that ends at "approve this".
- An ask that commits a person the author cannot commit.
- A claim about another function's work with no name attached to it.
- A narrative headline.
- A term invented for this document that the team does not use.
- A figure with no traceable source.

## Before it goes out

1. Every section present, or consciously collapsed to a line. A silently missing section is
   the failure mode; an empty one that says "N/A at this time, because..." is fine and the
   charter format does exactly that for its Architecture row.
2. Run `ground-check` on every figure.
3. Check the prose against `${CLAUDE_PLUGIN_ROOT}/references/language.md`, then run
   `humanizer`.
4. Read the Concerns section as your most skeptical approver. If their objection is not
   there, it is not finished.
5. Read the ask and every commitment once more against the author's mandate. Could the
   author personally deliver each one, or is it routed to a named owner? Anything that is
   neither has to move before this goes out.

## How you would know a document written this way worked

- It survives being forwarded to a skeptic without a round of "where did this number come
  from".
- The misreadings it pre-empted did not happen.
- It did not get longer without getting better. A one-decision brief is still one page.
- Nobody reading it asks who actually wrote this. Every commitment in it is the author's to
  make, and everything else is named as somebody else's call.
