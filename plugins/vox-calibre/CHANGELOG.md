# vox-calibre changelog

This log covers both `vox-calibre` (the Claude Code output style) and `vox-calibre-chat` (the
claude.ai skill). They share one set of rules and always release with the same version number.

## 0.3.1 (2026-10-09)

- A "Needs you" callout with more than one item puts a blank `>` line between items, so each item is
  its own paragraph instead of running together with the others. The example shows two items.

## 0.3.0 (2026-10-09)

- New section, "When a reply needs something from the reader": in chat, a reply that waits on the
  reader ends with a `> **Needs you:**` blockquote, one standalone line per open item, including
  earlier asks still unanswered. A reply that needs nothing has no callout.
- "Reporting finished work" now puts what the reader needs to decide in that callout.

## 0.2.1 (2026-10-09)

- The output style's Grounding line now credits [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)
  (MIT) for the six banned-list entries that 0.2.0 adapted. The chat skill picked up the same line
  through `scripts/sync-vox-calibre.py`.
- The chat skill's description no longer names UCG-STE, the style's former name. It dropped
  "UCG style" and "STE" as trigger phrases, added "Vox Calibre", and skips itself only when the
  Vox Calibre output style is active.

## 0.2.0 (2026-10-08)

- Added six entries to the banned list, adapted from hardikpandya/stop-slop: binary contrasts
  (replacing the negative-parallelism entry), throat-clearing openers, intensifiers, vague
  declaratives, false agency, and business jargon.
- Restored the humanizer reference that the quick-check sentence points to, and removed the
  style's own em dashes and a double period.
- Regenerated the chat skill, which also picked up example edits it had drifted from.

## 0.1.0 (2026-10-07)

- First release in this marketplace, copied from UplandCapitalGroup/UCG.Claude.Plugins#27.
  Vox Calibre was previously named UCG-STE.
