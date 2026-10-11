# PII watch: Claude Code hooks that ask before PII reaches the model

Status: planned, not built. Decided with Mike Stegmaier on 2026-10-11 in a design interview.
Monday ticket: [Build PII warning hooks for Claude Code](https://upland-bunch.monday.com/boards/18406890255/pulses/13259576768) (Data Engineering Requests, AI Governance).

## What this is for

Claude Code sends whatever a tool returns, and whatever a user pastes, to the model. For a data engineer that includes query results from Snowflake tables that hold policyholder and claimant PII. This plugin checks that data on the user's own machine first and, when it finds possible PII, asks the user whether to send it.

It is the endpoint half of risk 17 in the Aimpoint Claude Code risk register ("enforced PII masking before data enters context", rated critical). The warehouse half is Snowflake tag-based masking, which is still at proposal status. This plugin doesn't replace masking: it warns where masking doesn't reach yet, and it covers files and pasted text that masking never will.

The plugin never blocks or rewrites anything on its own. Every hit is a question to the user, who decides.

## Who it's for

- Prototype: Mike's Mac, installed as a plugin from this repo's marketplace.
- Then: the other Upland Claude Code users, on both Mac and Windows, as a plugin they opt into.
- Later: managed settings pushed to every Upland machine, once Courtney Kavan and Jeff Gottlieb adopt it under the Claude Code governance work.

## The rule that shapes everything

No check may send data off the machine. A classifier that asks a cloud model "is this PII?" has already sent the PII. So:

- Hooks are `type: "command"` scripts. `type: "prompt"` hooks send their input to a Claude model and are ruled out.
- The classifier is Laya, which runs locally. TypeSafe's Jev was considered and dropped: it is cloud-only.

## What it watches

| Entry point | Hook | Matcher |
|---|---|---|
| Tool calls that fetch data | `PreToolUse` | `Bash`, `Read`, `mcp__upland-analyst__.*`, other Snowflake MCP tools |
| Prompts the user pastes | `UserPromptSubmit` | all prompts |
| Tool output, as a backstop | `PostToolUse` | the same tools as `PreToolUse` |

Files Claude reads on its own while exploring a repo are out of scope for version 1. Hooks also fire inside subagents, so delegated work is covered.

## What counts as PII

| Category | Asks? |
|---|---|
| SSN or TIN | Yes |
| Bank account or card number | Yes |
| Driver's license number | Yes |
| Date of birth | Yes |
| Street address | Yes |
| Email address | Yes |
| Phone number | Yes |
| Claim or medical details in free text | Yes |
| Person names in a claimant context | Yes |
| Other person names (brokers, staff, insureds as business contacts) | No |
| Policy numbers, broker IDs, business entity names | No |

A name asks only when its column or table matches the claimant pattern list in the config (for example `CLAIMANT_*`, `INJURED_PARTY_*`, tables in claims schemas). Laya handles names in free text such as claim notes.

## How a check runs

1. **Rules.** Regex for the patterned categories (SSN with format checks, card numbers with a Luhn check, email, phone, DOB-shaped dates near a DOB-like label) and column-name and table-name rules from the config. Local and fast; decides most calls.
2. **Laya.** Only for what the rules can't decide: a column whose name is ambiguous, or free text. Laya answers yes or no with a score. A yes is a hit.
3. **Verdict.** Any hit becomes an ask. No hit means the call goes through.

`PreToolUse` sees the query or command, not the result, so for SQL it checks column names, table names, and literal values in the statement. `SELECT *` against an unknown view gives it nothing to match; the `PostToolUse` backstop covers that case.

## What the user sees

- **Tool calls.** `PreToolUse` returns `permissionDecision: "ask"` with a reason that names the category and count, never the value, for example "Possible PII: query selects DOB, CLAIMANT_NAME from CLAIMS.CLAIMANT". Claude Code shows its own approval prompt.
- **Pasted prompts.** `UserPromptSubmit` can only allow or block; it has no ask. So the hook opens a native dialog and waits: "Possible PII in your prompt: SSN pattern (2), email (1). Send anyway?" with Send and Cancel. Send lets the prompt through; Cancel blocks it and the user edits and resends. The dialog has no timeout of its own and stays up until the user answers. Mac uses `osascript`; Windows uses a PowerShell message box.
- **Full check down.** When Laya can't be reached, the result says so, for example "Pattern rules only: the full PII check is down." For an ask it goes in the reason; for a call that passes it goes in `systemMessage`.

## The Laya daemon

Laya (`convaiinnovations/laya`, about 400M parameters, Apache 2.0, pip `laya` 0.3.20) takes seconds to load, and a hook is a new process on every call. So Laya runs as a small daemon that holds the model in memory and answers over a local socket (a Unix socket on Mac, a named pipe or localhost port on Windows).

- The hook starts the daemon on first use. The daemon exits after 30 minutes idle.
- Each classification has a 5 second timeout.
- **If the daemon is down, the hook restarts it once** and waits for it to load. If it is still unreachable, or the restart fails, the regex result stands, the user sees the "full check is down" note, and the audit line records `laya: unavailable`.
- After a failed restart, the hook doesn't try again for 5 minutes, so a broken install doesn't add a restart wait to every call.
- Install size: Hugging Face pulls the whole repo, which is 2.2 GB, not the 842 MB English checkpoint. The installer should download only the files the daemon loads.

## The backstop

A `PostToolUse` hook runs the regex rules over the tool's actual output and replaces hits with tokens like `[PII:SSN]` using `updatedToolOutput`, so the values never reach the model. It's a backstop, not the gate:

- The tool has already run, and the Claude Code docs say telemetry records the original output.
- For built-in tools, an `updatedToolOutput` whose shape doesn't match is silently ignored. The build ships a test per tool that proves redaction landed.

## The audit log

One JSONL line per hit in a local file: timestamp, hook, tool, categories and counts, which checks ran (`rules`, `laya`, or `laya: unavailable`), and the user's choice. It never stores the matched values. The log is the evidence for the governance readout that the control fires and how users respond.

## Proving Laya before trusting it

Laya's only published accuracy figure is 0.766 on the vendor's own benchmark, and nobody has tested it on Upland data. Until it passes, the rules alone decide.

- A script that runs only in the user's terminal queries Snowflake directly and pulls about 100 values from a column list Mike picks: claimant, broker, insured, and entity names, free-text claim notes, and patterned PII columns.
- Each value is labeled by its column (a value from an SSN column is PII; one from `BROKER_NAME` is not). Mike labels free-text notes by hand in the same local file.
- The script runs Laya on every sample and writes only the scores: caught, missed, false alarm. Claude sees the score file, never the values. The script deletes the samples when it finishes.
- **Pass bar:** Laya catches at least 95 percent of the PII samples. False alarms don't count against it, because they cost the user one click. Below 95 percent, version 1 ships with the rules only and Laya waits.

## Configuration

One config file holds everything a reviewer would want to change without touching code: the regex categories and which ones are active, the claimant column and table patterns, the pass-through list, the matchers, the Laya timeout and idle exit, and the audit log path. That file is what gets handed to governance.

## Build order

1. Laya test-set script, then the accuracy run. Everything about Laya waits on its score.
2. Rules engine and config, with a self-check that runs sample strings through every category.
3. `PreToolUse` hook returning `ask` with reasons.
4. `UserPromptSubmit` hook with the Mac dialog.
5. Audit log.
6. Laya daemon with the restart rule, if Laya passed.
7. `PostToolUse` backstop with its per-tool redaction test.
8. Windows dialog and daemon transport, then hand it to a volunteer on Windows.

## Open risks to check during the build

- **Hook timeout on the prompt dialog.** Claude Code kills a hook at its timeout. If a timed-out `UserPromptSubmit` hook counts as a non-blocking error, the prompt goes through unanswered, which is the leak this exists to stop. Set the hook's timeout to the maximum Claude Code allows, then test what happens when it expires. If it fails open, the dialog needs a different design.
- **Headless runs.** The docs don't say plainly that hooks fire in `claude -p` runs. Mike's scheduled jobs use `claude -p`; test it. A dialog can't be answered in a headless run, so headless needs its own rule.
- **SQL parsing.** Regex over SQL misses `SELECT *`, views, and CTEs. That's accepted for version 1 because the backstop and Snowflake masking cover it.
- **Snowflake MCP conflict.** A local hook warns that the `upland-analyst` MCP server conflicts with Cortex Code CLI. The matchers must name whichever Snowflake tools users run.

## Related

- Aimpoint risk register, risk 17; Claude Code governance page in the wiki (`claude-code-governance`).
- Snowflake tag-based masking plan (`snowflake-tag-based-masking-plan`), 11 PII categories for `UPLAND_MCP_CONNECT`.
- Idea note: `wiki/Ideas/pii-watch-mod-for-claude-code.md`.
- Laya install: `~/.venvs/laya/`; model cache `~/.cache/huggingface/hub/models--convaiinnovations--laya/`.
