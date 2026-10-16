# The phase-gate project charter

The row labels below come from a working phase-gate process. If your organization already
has a charter template, its labels win; otherwise use these. Keep them, keep their order, and keep
the label text even where a row is empty. The charter is a governance document: an approver
scanning for the row they own needs to find it in the same place every time.

The format is a two-column table, label on the left, content on the right. In markdown, write
each row as a `##` heading. Whoever formats it for the phase gate can convert.

---

## Phase

`POC`, `Pilot`, or `Production`. One word. The phase gate this charter is asking to enter.

## Stage

Where inside the phase, for example `Mobilize`. One word.

## Purpose

Three blocks, in this order.

**Summary:** what the thing is and who it serves, in plain language a reader outside the team
understands. No table names, no pipeline nouns.

**The Goal:** one sentence naming the end state.

**Our recommendation is:** the recommendation, labeled exactly like that. Say what to do,
name the workstreams it splits into, and say what the phase-gate structure protects against.
A reader who stops here should know what you are asking for.

Close with any standing note that survives a "no", for example work in the charter that the
team would do anyway because it has value beyond this project. That note is what makes a
decline safe to make.

## Problem Statement(s)

The problem as it happens today, with a measurement. Name the concrete steps a person
performs manually. Name who is affected and how the burden splits across them.

End with **The Opportunity:** in one sentence.

Rules 1 through 6 in `SKILL.md` apply hardest here. If the only evidence is an adjective, go
get a number first.

## Financial Impact

Four blocks. Not all apply to every phase.

1. **This phase's budget.** What it costs to do the work in front of us. Say plainly when the
   technology cost is immaterial and the real cost is team time.
2. **Cost discovery as a deliverable**, when the production cost is not yet knowable. List
   what the phase will establish: per-unit compute, maintenance, infrastructure, total cost
   of ownership. Say which of those a later phase has to answer instead, and why.
3. **Business-quality impact.** The argument in the business's own measure, for example
   loss ratio at an insurer or defect rate in manufacturing. This is the domain-native half
   and it is the half an engineer forgets.
4. **Efficiency gains.** Time saved, capacity added. Mark unvalidated numbers
   `(to be validated)`.

Anchor every new spend figure against the line it acts on (rule 3).

## Architecture Diagram

The diagram, or an explicit reason there is none, naming who agreed. "N/A at this time, per
conversations with <name>, because architecture is itself a deliverable of this phase" is a
complete answer. An empty row is not.

## Concerns

The most valuable row in the charter, and the one most often skipped.

Write each objection as a bold question in the approver's own voice, then answer it under
`Response:`. Four or five. Cover at minimum:

- Should we buy this instead of building it? Answer with what building buys, and say you stay
  open to a vendor without delaying on a hypothetical one.
- Are we over-committing before we have validated anything? Answer with the phase gate, and
  state that shelving the work is a real possible outcome.
- How do we know the output is accurate? Answer with the validation method, and make that
  method a deliverable if it does not exist yet.
- Who checks the output, and does this add work to the people it is supposed to help?

Name a rejected alternative with its price wherever one exists (rule 10).

## Finances

Usually empty at POC. Finance fills it.

## Success Measures

Numbered. Each one is a state that either was or was not reached, with a target where a
target is measurable. Written before the work, not after.

Keep these separate from Deliverables even when they look similar: a deliverable is a thing
that exists, a success measure is a bar it cleared.

## Assumptions

A flat list of what you are proceeding as if true, written so that someone who knows better
can contradict you. Technology readiness, other teams' availability, vendor API stability,
your own team's capacity. Anything here that turns out false changes the plan, which is the
point of listing it.

Assumptions are not risks and not unknowns. See rule 7.

## In Scope Items

Named, specific, and small enough to check off. Include the population the phase covers, for
example one program rather than all of them.

## Out of Scope Items

Named. Document types, other programs, and the next phase itself when implementation would be
a separate charter. This row prevents more rework than the In Scope row creates.

It is also where work that belongs to another function goes. If the technically right answer
needs a workstream outside the author's mandate, it comes out of scope here with its owner
named, rather than being absorbed into the charter because it was convenient.

## Deliverables

The artifacts that exist when the phase ends. Each with one line of what it contains.

Always include a **Go/No-Go decision criteria** deliverable: the metrics and criteria the
phase gate will be decided on. Writing it as a deliverable is how you avoid deciding the
criteria after you already know the result.

## Milestones

Dates, or the named thing the dates depend on. "TBD" alone is not an answer; "TBD pending
working-team alignment on the project plan" is.

## Members & RACIQM status

RACIQM is Responsible, Accountable, Consulted, Informed, Quality Control, Manage (for
example PMO or admin).

List by letter, names after each. Then name the working team separately, because the working
team is who actually meets.

This row is where the human ask lives. Name the people you need, including the ones whose
hours you need but who do not report to you.

It is also the row that keeps a charter inside its author's mandate. If you cannot name an
`A` for a workstream, that workstream is not yours to charter yet: either find its
accountable owner or move it out of scope. A charter that lists an author's own name against
a business-unit workstream is claiming a mandate the author does not have, and the phase
gate is where that surfaces.

## Risks and mitigations

Each risk gets a bold title, one line of what goes wrong, and a bold `Mitigation:` line. Never
a risk on its own.

Cover at minimum data security and privacy, team capacity, adoption and change management,
technical feasibility of the hardest integration, output quality, and the risk that the phase
does not earn its way to the next one. For that last one, say the outcome is acceptable and
why (rule 9).

Add an `Impact:` line where severity is not obvious from the title.

## Q / A

A link to the running questions list. Questions live there and move to Concerns when they get
an answer worth publishing.

## Actions to Complete Charter & Initiate Work

What has to happen for this document to stop being a draft. Usually approval plus one
alignment meeting.

## Governance (Approvals)

Who signs. Filled during the gate.

## Approved Budget

Filled after approval.

## Contract Terms

`N/A` when nothing is being bought.

## Defined Roles

The role labels your organization's charters use, one per line, name or `TBD` after each.
Without a house list, use `Executive Sponsor`, `Project Sponsor`, `PM`, `IT`, `Business
Analyst`, `Architecture`, `Leads / SMEs`.

If the house labels are abbreviations, leave them as they are; they are the team's.

## Sunset Review

Empty until there is something to retire.

## [Other potential headers or appendices as needed]

The optional set: meeting structure and frequency, operating standards, reporting standards,
notes, dependencies and constraints, radar issues, work breakdown structure.

## Pilot Results/Deliverables Achieved

Filled at the end of the phase. This row is how a charter becomes its own readout, so a Pilot
charter does not need a separate document to close it out.

## WBS

A five-column table: `#`, `Who`, `What`, `By When`, `Note`. Empty at charter time on a POC.

---

## What the house rules add to this format

This charter format is strong on governance and weak on figure provenance. Three additions,
none of which change a row label:

1. Every figure in Financial Impact and Problem Statement(s) carries its measurement date,
   and `ground-check` traces it before the charter goes to the gate. A charter that
   states a 60-minute review time and a 60-70% time saving with no source attached has not
   met the house rule.
2. Unknowns get their own short list inside Assumptions, marked as unknowns rather than
   assumptions, with exactly one flagged load-bearing.
3. Under any cost table, one line saying what the columns are not.
