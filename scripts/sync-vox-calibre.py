#!/usr/bin/env python3
"""Copy the Vox Calibre rules from the vox-calibre output style into the two skills that carry them.

plugins/vox-calibre/output-styles/vox-calibre.md is the only copy you edit. Claude Code reads it
as an output style; claude.ai chat ignores output styles, so the vox-calibre-chat plugin carries
the same body as a skill. The ChatGPT skill carries it too, minus the sections that only make sense
for Claude Code work (CHATGPT_DROP). In each SKILL.md, everything above MARKER is hand-written and
kept; everything below it is replaced.

  python3 scripts/sync-vox-calibre.py          rewrite both SKILL.md files from the output style
  python3 scripts/sync-vox-calibre.py --check  exit 1 if a SKILL.md has drifted or a ChatGPT file is over its limit
"""
import re
import sys
from pathlib import Path

PLUGINS = Path(__file__).resolve().parent.parent / "plugins"
STYLE = PLUGINS / "vox-calibre" / "output-styles" / "vox-calibre.md"
SKILL = PLUGINS / "vox-calibre-chat" / "skills" / "vox-calibre" / "SKILL.md"
CHATGPT = PLUGINS.parent / "chatgpt" / "vox-calibre"
CHATGPT_SKILL = CHATGPT / "vox-calibre" / "SKILL.md"
# Sections and passages that assume Claude Code, Upland, or data-engineering work.
CHATGPT_DROP_SECTIONS = ("## Reporting finished work", "## Change notices")
CHATGPT_DROP_TEXT = (
    "For anything published outside the team, run the `humanizer` skill as a final pass. The banned list above is the quick check; the skill checks 33 patterns. If the skill isn't installed, use Wikipedia's \"Signs of AI writing\" and say the skill wasn't available.\n\n",
    " (Mike, 2026-09-02.)",
)
# ChatGPT custom instructions are hand-condensed copies; --check only enforces ChatGPT's box limits.
CHATGPT_LIMITS = {"custom-instructions.md": 5000, "custom-instructions-short.md": 1500}
MARKER = "<!-- Generated from plugins/vox-calibre/output-styles/vox-calibre.md by scripts/sync-vox-calibre.py. Edit that file, not this one. -->"


def style_body():
    text = STYLE.read_text()
    assert text.startswith("---\n"), f"{STYLE} has no frontmatter"
    return text.split("\n---\n", 1)[1].lstrip("\n")


def chatgpt_body():
    sections = re.split(r"(?m)^(?=## )", style_body())
    body = "".join(s for s in sections if not s.startswith(CHATGPT_DROP_SECTIONS))
    for text in CHATGPT_DROP_TEXT:
        # Fail loudly when the output style changes under a drop rule, instead of shipping the passage.
        assert text in body, f"CHATGPT_DROP_TEXT no longer matches {STYLE}: {text[:60]!r}"
        body = body.replace(text, "")
    return body


def build(skill, body):
    head = skill.read_text().split("<!-- Generated from", 1)[0]
    return f"{head}{MARKER}\n\n{body}"


if __name__ == "__main__":
    targets = {SKILL: build(SKILL, style_body()), CHATGPT_SKILL: build(CHATGPT_SKILL, chatgpt_body())}
    if "--check" in sys.argv:
        for name, limit in CHATGPT_LIMITS.items():
            size = len((CHATGPT / name).read_text().rstrip("\n"))
            if size > limit:
                sys.exit(f"{CHATGPT / name} is {size} characters; ChatGPT allows {limit}")
        for skill, want in targets.items():
            if skill.read_text() != want:
                sys.exit(f"{skill} is out of date. Run: python3 scripts/sync-vox-calibre.py")
        print("both skills match the vox-calibre output style, and the ChatGPT files fit their limits")
    else:
        for skill, want in targets.items():
            skill.write_text(want)
            print(f"wrote {skill}")
