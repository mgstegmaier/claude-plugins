#!/usr/bin/env python3
"""Copy the Vox Calibre rules from the vox-calibre output style into the vox-calibre-chat skill.

plugins/vox-calibre/output-styles/vox-calibre.md is the only copy you edit. Claude Code reads it
as an output style; claude.ai chat ignores output styles, so the vox-calibre-chat plugin carries
the same body as a skill. Everything in SKILL.md above MARKER is hand-written and kept; everything
below it is replaced.

  python3 scripts/sync-vox-calibre.py          rewrite SKILL.md from the output style
  python3 scripts/sync-vox-calibre.py --check  exit 1 if SKILL.md has drifted (run before pushing)
"""
import sys
from pathlib import Path

PLUGINS = Path(__file__).resolve().parent.parent / "plugins"
STYLE = PLUGINS / "vox-calibre" / "output-styles" / "vox-calibre.md"
SKILL = PLUGINS / "vox-calibre-chat" / "skills" / "vox-calibre" / "SKILL.md"
MARKER = "<!-- Generated from plugins/vox-calibre/output-styles/vox-calibre.md by scripts/sync-vox-calibre.py. Edit that file, not this one. -->"


def style_body():
    text = STYLE.read_text()
    assert text.startswith("---\n"), f"{STYLE} has no frontmatter"
    return text.split("\n---\n", 1)[1].lstrip("\n")


def build():
    head = SKILL.read_text().split("<!-- Generated from", 1)[0]
    return f"{head}{MARKER}\n\n{style_body()}"


if __name__ == "__main__":
    want = build()
    if "--check" in sys.argv:
        if SKILL.read_text() != want:
            sys.exit(f"{SKILL} is out of date. Run: python3 scripts/sync-vox-calibre.py")
        print("vox-calibre-chat skill matches the vox-calibre output style")
    else:
        SKILL.write_text(want)
        print(f"wrote {SKILL}")
