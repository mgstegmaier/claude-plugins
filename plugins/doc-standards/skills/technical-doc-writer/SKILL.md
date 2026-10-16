---
name: technical-doc-writer
description: Standards for technical documentation — pipelines, runbooks, READMEs, architecture docs, procedure/system docs. Use whenever writing or substantially updating technical documentation ("document this", "write a runbook", "update the docs", creating *_DOCUMENTATION.md), or when reviewing docs for quality. Produces docs that are readable by non-engineers, actionable for troubleshooting, and precise enough for AI agents to operate from.
---

# Technical Documentation Standards

One goal: a reader with a problem finds the fix without reading the whole document, and a reader with no context understands the system without asking anyone. Three audiences share every doc — non-engineers (read the first screen only), engineers at 2am (jump to operations/gotchas), and AI agents (need exact names and verbatim strings). Serve all three by layering, not by writing three documents.

## The layered template

Order sections by how often each audience needs them. Skip sections that don't apply — never pad.

```markdown
# <System Name> — <what it is in five words>
**Last updated:** YYYY-MM-DD

## Overview
2–4 plain-English sentences: what it does, for whom, why it exists.
No jargon. A VP should understand this paragraph.
Then a flow diagram (ASCII or mermaid) — the picture IS the architecture doc.

## <Reference matrix>
Tables for anything enumerable: environments, objects, endpoints, owners,
schedules, SLAs. One column per environment, one row per fact.

## How it works
The mechanism, briefly. Include the INVARIANTS — assumptions that must hold
("every order has a valid customer_id", "events arrive within 24h"). When an
invariant breaks someday, this section makes root cause obvious.

## Operations
Runnable, copy-paste commands for every routine action: health check, manual
run, refresh, resume/suspend, backfill. Fully qualified names. No screenshots.

## Gotchas
Symptom → cause → fix. Include error messages VERBATIM — responders and AI
agents search by exact error string.

## Known gaps / follow-ups (as of YYYY-MM-DD)
What's broken-by-design or pending, who owns the fix, what unblocks it.
Strike through resolved items with the resolution date rather than deleting.
```

## Rules

**Lead with the picture.** After the plain-English overview, a flow diagram — `source → transport → storage → processing → output` with real object names on the arrows. One diagram replaces three paragraphs and is what people remember.

**Every claim is checkable, every action is runnable.** If the doc says "the job fires when new files land in the inbox," it also shows the command that proves it (`ls -l /data/inbox`, `systemctl status nightly-load.timer`). Commands must be copy-paste runnable: fully qualified object names, real values, no `<placeholders>` unless the value is genuinely per-reader.

**Verbatim error text, always.** Write `403 Forbidden: access denied for role reader`, not "a permissions error." Humans grep for the exact string; AI agents match on it. A gotcha without the exact error message is a rumor.

**Date the volatile, and defer to live state.** Facts come in two kinds. Stable facts (architecture, names, wiring) get stated plainly. Volatile facts (job states, quotas, row counts, what's currently broken) get a date — and when state churns faster than docs, say so explicitly: "Job run state changes with active development — check `systemctl list-timers`, don't trust this doc." A doc that asserts stale state as truth is worse than no doc.

**Write down the invariants.** The most valuable sentence in a pipeline doc is the assumption nobody thought to state. "Directory auto-refresh requires the storage event subscription — without it, refresh never fires." When something breaks mysteriously, broken invariants are where the answer lives.

**Tables beat prose for enumerable facts.** Environments, objects, credentials locations, role grants: matrix them. Prose explains *why*; cells hold *what*. Never bury a fact mid-paragraph that belongs in a table.

**Ruthless brevity, human voice.** Paragraphs of four sentences or fewer. Cut throat-clearing ("It is important to note that..."), cut "simply/just/easily", cut anything the reader can't act on. Wordy and dry are the same failure: both mean the writer didn't decide what matters. But brevity means selectivity, not fragments — complete sentences, technical terms spelled out on first use.

**Doc prose follows the plugin's language rules.** Read `${CLAUDE_PLUGIN_ROOT}/references/language.md` before drafting. It holds the house voice, word choice, term definitions, instruction phrasing, and the banned-word list, and it applies whether or not the Vox Calibre output style is installed; do not duplicate its rules here. Code blocks, commands, and verbatim error strings are exempt (its "Never simplify" section says the same).

**Humanizer pass before shipping — mandatory.** Every new or substantially updated doc gets a pass with a humanizer skill (for example `humanizer:humanizer`) before it's committed or published. Technical docs do not get an internal-docs exemption. If no humanizer skill is installed, apply the patterns manually (Wikipedia's "Signs of AI writing") and say the skill wasn't available. The big tells to kill in docs: em/en dashes as rhythm, bolded inline-header bullet lists, emoji/dash table markers, subjectless fragments ("No configuration needed"), and parallel adjective stacks doing rhythm work instead of information work ("fast, reliable, affordable"). A real list of three things is fine.

**Docs live with the code and change with it.** The doc for a thing lives in the repo that defines the thing, and updates ride the same commit/PR as the behavior change. A doc updated in a separate "documentation pass" is already rotting. Where a tool generates docs from source (OpenAPI, schema docs), generate — hand-write only what can't be derived.

**Placement: keep markdown docs in a tracked docs directory.** Version-controlled `.md` docs go in the repo they describe (for example `docs/`), following the repo's own convention if it has one. Binary working files (docx, pdf, drafts) may live elsewhere, but never version the doc only as a binary. Before writing a doc, confirm its path isn't gitignored (`git check-ignore <path>`); a doc that exists only on one laptop isn't documentation. When a doc also needs to reach non-repo readers, publish a copy where they read (team wiki, shared drive) and treat the repo copy as the source of truth.

**One doc, one system.** AI agents and humans both do better with focused pages than sprawling guides. If a doc covers two systems, split it. If it exceeds ~2 pages, it's probably drifting into white-paper territory — move explanation-heavy material to a separate explainer and keep the operational doc lean. When non-engineers need the explainer, `primer-writer` in this plugin writes it from the finished doc.

**Code and commands before commentary.** Readers (and AI agents) treat the first code block as canonical. Make sure the first command shown is the right one, not a setup detour.

## Anti-patterns

- **The white paper.** Ten pages of prose, zero runnable commands. Nobody reads it twice.
- **The screenshot manual.** Pictures of consoles can't be grepped, diffed, or executed. Commands only.
- **Stale state as fact.** "The task is suspended" with no date, still asserted a year later.
- **The euphemism gotcha.** "May encounter permission issues" instead of the actual error string.
- **Passive mush.** "It was decided that the endpoint should be provisioned" — by whom? Say who does what: "Infra approves the network rule; we then create the connection."
- **Placeholder soup.** `run-report --env <env> --date <date> --out <path>` with no real example — the reader came here to avoid figuring that out.
- **Duplicating the code.** Restating what a source file already says line-by-line. Link to the file; document what it *can't* say (why, invariants, failure modes).
- **Undated "current status" sections.** Status without a date is fiction with confidence.

## Pre-ship checklist

1. Could a non-engineer read the first screen and correctly describe what this system does?
2. Could an on-call engineer who has never seen this system resolve the most likely failure using only the Gotchas + Operations sections?
3. Could an AI agent operate the system from this doc alone — are all object names fully qualified, all commands runnable, all error strings verbatim?
4. Is every volatile fact dated, and does anything that churns point at the live-state command instead of asserting?
5. Did you cut everything the reader can't act on or won't remember?
6. Does the doc live next to the code it describes, and is it in the same commit as the change that made it true?
7. Does the prose pass Vox Calibre, with terms defined at first use, no banned words, where-before-what in every step?
8. Did the humanizer skill run on the final text (for example `humanizer:humanizer`; manual pattern pass with a disclosure if none is installed)?

## Grounding

Synthesized from the Diátaxis framework (docs split by reader mode: learning / doing / lookup / understanding — our template is a how-to + reference + runbook hybrid, which fits operational data systems), SRE runbook practice (failure modes → diagnosis → fix → escalation, written so the responder needn't understand the system deeply), pipeline-documentation guidance (purpose, sources, destinations, owner, SLA, invariants; docs-as-code so they don't rot), and AI-readability research (focused pages, exact error strings, canonical first code block, markdown over rendered HTML).
