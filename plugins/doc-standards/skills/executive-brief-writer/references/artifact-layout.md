# The brief as an artifact

When the output is a published page rather than a document, use this layout.

The look is a printed broadsheet: serif body text, one accent color, hairline rules instead
of shadows, mono type for anything a machine produced. It reads as a document an executive
was handed, not as a dashboard.

`artifact-design` still owns design judgment. This file is the house starting point so a
brief does not get redesigned from nothing each time.

## Tokens

```css
:root{
  --ground:#f2f5f7;  --paper:#fbfcfd;
  --ink:#131a22;     --ink-soft:#4e5c6a;  --ink-faint:#5d6b78;
  --rule:#d3dbe2;    --rule-soft:#e4eaee;
  --accent:#0f5f6b;  --accent-soft:#e2eef0;
  --alert:#9e4a1c;   --alert-soft:#f4e7dd;
  --shadow:rgba(19,26,34,.07);
}
```

`--ink-faint` is darker than the reference page's `#7b8894`, which measured about 3.3:1 on
`--ground` and failed the 4.5:1 floor for the small mono labels it colors. `#5d6b78` measures
5.0:1.

Dark values, redefined under both `@media (prefers-color-scheme: dark)` guarded as
`:root:not([data-theme="light"])` and `:root[data-theme="dark"]`:

```css
--ground:#0f151b;  --paper:#161e26;
--ink:#e8eef3;     --ink-soft:#a3b1bd;  --ink-faint:#78889a;
--rule:#2a3641;    --rule-soft:#212b34;
--accent:#57b6c2;  --accent-soft:#17323a;
--alert:#dd9159;   --alert-soft:#33241a;
--shadow:rgba(0,0,0,.4);
```

Three fonts, each with one job:

| Face | Used for |
|---|---|
| Source Serif 4, 17.5px, line-height 1.62 | Body prose |
| Archivo, 600 and 700 | Headings, table row labels, step titles |
| IBM Plex Mono | Gutter labels, metadata, figures, targets, queries, anything measured |

Sheet is `max-width:960px`, centered, `padding:clamp(20px,4vw,56px) clamp(16px,4vw,40px) 72px`.

## The seven components

**Masthead.** `border-top:3px solid var(--ink)`. Mono kicker in accent, Archivo h1 at
`clamp(32px,5.2vw,50px)` with `text-wrap:balance`, a standfirst capped at `62ch`, then a
metadata strip ruled top and bottom holding prepared-for, by, date, decision-needed.

**Sections with a gutter label.** Every section is
`grid-template-columns:112px minmax(0,1fr)` with an uppercase mono label in the left column.
The label names the section's **job**, not its topic: "What breaks today", "How much it
costs", "How we know". Collapses to one column under 700px.

**Figure strip.** A `repeat(auto-fit,minmax(150px,1fr))` grid with 1px gaps over a rule-colored
background, so the cells read as one ruled block. Big Archivo number with
`font-variant-numeric:tabular-nums`, mono caption under it. Add `.hot` to put the alert color
on the one figure that is the argument. Use this only when those figures are the argument;
four is the ceiling.

**Two-column risk rows.** `minmax(0,1fr) minmax(0,1.15fr)`: the risk on the left with a bold
Archivo title and soft-ink description, the handling on the right prefixed with a `→` in
accent. Neither can appear without the other, which is the point. An `open` pill in alert
color marks the unquantified one.

**Success-criteria horizons.** A block per horizon with `border-top:2px solid var(--accent)`,
an Archivo title, a mono `when` line, then criteria as a two-column grid with the target
right-aligned in mono. The stop block gets `border-top-color:var(--alert)` and alert-colored
targets.

**The ask card.** `background:var(--paper)`, `border-top:3px solid var(--accent)`, one soft
shadow. Steps are a counter-reset list where each number sits in a 30px column with an accent
rule above it, mirroring a rule above the step title. The human request goes below the steps,
separated by a hairline.

**Provenance drawers.** `<details>` with a custom `+` / `−` marker in accent, the figure's
value right-aligned in the summary so the page can be skimmed without opening anything, and
inside: the query in a `<pre>`, the verbatim result in `pre.out` on accent-soft, then a
paragraph of what it means. `details[open]` takes an accent border.

## Rules for the page

- Tables live inside `.scroll` (`overflow-x:auto`) with `min-width:520px`. Nothing else
  scrolls sideways.
- Numbers in tables use `td.num` with tabular numerals and `white-space:nowrap`.
- A summary row takes `tr.total`, filled with accent-soft.
- Charts are hand-written inline SVG with a real `aria-label` describing the trend in words,
  plus a `figcaption` saying what the chart is for. No chart library.
- Prose is capped at `66ch`, caveat lists at `64ch`.
- Every section is separated by `border-bottom:1px solid var(--rule-soft)`, never by a shadow
  or a card.
- The footer is one mono paragraph: source document and revision, the measurement date, and
  the ticket number.

## Before publishing

Follow the standing artifact rules: title, favicon, both themes, phone width at 400px, and
`ground-check` on every figure. A brief that will be forwarded is worth reading once at
phone width first, because that is where it gets read.
