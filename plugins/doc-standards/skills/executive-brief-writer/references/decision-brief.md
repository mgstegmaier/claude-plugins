# The decision brief

For anything that asks one named person to decide and is not going through the charter gate:
a proposal, a funding ask, a pilot readout, a scope decision.

Eleven sections. A section can collapse to a single line when it does not apply, but it
cannot be silently absent. An omitted section has to be a decision you made on purpose.

`artifact-layout.md` has the HTML layout for a brief published as a page.

| # | Section | Its job | It has failed when |
|---|---|---|---|
| 1 | Masthead | What this is, for whom, by whom, dated, and the decision needed | You cannot fill the decision-needed field, which means this is a status update |
| 2 | The problem, quantified | One measured number, one incident that already happened | Adjectives stand in for measurements |
| 3 | What we would build | Plain language, one paragraph, no schema | It reaches for implementation nouns the reader does not have |
| 4 | Shape of the work | Options, or stacked phases with why that order | It presents options without saying what each one buys |
| 5 | Cost | Figures, the baseline they act on, and what the columns are **not** | The reader supplies their own framing and gets it wrong |
| 6 | The ask | A numbered sequence, split into what you will do, what you need from the reader, and what needs someone else | It ends at "approve this", or it commits a person the author cannot commit |
| 7 | What good looks like | Thresholds per horizon, plus stop conditions | Written after the work, or only for the pilot |
| 8 | Risks | Enumerated, each paired with its handling | A risk appears with nothing beside it |
| 9 | Unknowns | Enumerated separately, exactly one marked load-bearing | Blended into risks, where they read as handled |
| 10 | Reversibility, effort, cadence | Can we undo it, whose time it takes, when they hear back | Approval feels like a one-way door into silence |
| 11 | Provenance | Every figure traced, collapsible, with a caveats list | Numbers with no lineage |

## Section notes

**1. Masthead.** Kicker naming the program and phase, a title that names the thing rather
than narrating it, a standfirst of two or three sentences that a reader could stop after, and
a metadata strip: prepared for, by, date, decision needed.

The `by` field is a person, and it sets the boundary for everything below. What the document
asks for has to be inside that person's mandate or routed out of it by name.

**2. The problem.** Lead with the measurement, then explain the mechanism that produces it,
then name the incident that already happened. A past incident is worth more than a projected
one. Say what happens if nothing changes, in numbers: growth in volume, an allowance that
shrinks as inputs grow.

**3. What we would build.** One paragraph. Also say what does not change, by name. "Nothing
about how files arrive changes" removes a whole category of objection before it forms.

**4. Shape of the work.** When the work stacks in layers or phases, give each one a table row:
what it adds, and why it comes in that order. Then say plainly whether the first layer is
thrown away by the second. Readers assume phase 1 is a stopgap unless you tell them it is not.

**5. Cost.** Before the table, one paragraph naming the rate source and its effective date,
and saying volumes are measured rather than estimated. After the table, the two lines that do
the real work: what the columns are not, and what the figures exclude with the price of the
thing excluded. Close by anchoring against the existing line the spend acts on.

**6. The ask.** Numbered steps, each with a bold title and one paragraph. The last step is
always how the decision gets made and on what evidence. Then, set apart, the human request,
in three parts that stay distinct:

- **What I will do.** Your own hours and your own team's. Written in the first person,
  because you are the one who has to deliver it.
- **What I need from you.** The reader's own decision or resource.
- **What needs someone else.** A need outside your mandate, named with whose call it is.
  Where the reader is the sponsor who can route it, say so and let them route it. Never
  write it as a resource you are claiming.

The third part is the one that goes wrong. A brief from the infrastructure owner that asks
for two hours of a domain expert's time has quietly changed author. Write the need, name the
owner, and the same information lands without your name on a commitment you cannot keep.

**7. What good looks like.** Three horizons plus a stop block: at the readout, in production
later, and specifically for any second phase whose cost is not yet justified. Each line is a
criterion with a right-aligned target. The stop block carries the alert color and says its
conditions were named in advance so the answer is not argued afterward.

**8. Risks.** Two columns, the risk on the left and its handling on the right, so neither can
appear alone. Mark the unquantified one `open` so severity is visible without reading prose.
Cover security and access, silent failure modes, cost growth, a deploy step that could be
missed, and anything that is expensive to change later.

**9. Unknowns.** Where the brief is short, these can live inside the risk grid as the row
marked `open`, and in the provenance caveats list. Where the brief is longer, give them their
own section. Exactly one is load-bearing.

**10. Reversibility, effort, cadence.** Three short lists side by side: if we stop, what it
takes, when you hear back. This is the section that turns an approval from a commitment into
an experiment.

In the "what it takes" list, keep your own time and other people's time on separate lines,
and name the function each other person belongs to. "Two weeks of my time" and "an
domain expert's judgment, which needs a sponsor" are different kinds of cost and the reader
prices them differently.

**11. Provenance.** One collapsible block per figure, each holding the query, what it
returned verbatim, and a paragraph explaining what the numbers mean and reconciling them
against any different figure the reader has seen before. Close with a caveats block listing
what is assumed rather than measured. Run `ground-check` to produce this; do not hand-write it.

## Length

A one-decision brief is one page. The eleven sections are a checklist of what has to be
answered, not a minimum word count. If a section is one line, make it one line.
