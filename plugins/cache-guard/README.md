# cache-guard

A Claude Code mod that stops you before a send re-writes a cold prompt cache. Claude Code caches your conversation for an hour after each request. When you come back later than that, the next message pays to write the whole context into the cache again, which can cost several dollars on a long session.

When a send would do that, cache-guard opens a dialog with the estimated cost and two buttons:

- Proceed sends the prompt and pays the re-write.
- Start new session runs `/clear` and puts your prompt back in the box, so you don't retype it.

Dismissing the dialog, or typing an answer under Other, puts the prompt back in the box without sending it, and the next send goes through. The dialog only appears when the cache has been cold for an hour or more and the context holds at least 50,000 tokens. Slash commands are never guarded.

cache-guard is the cold-send dialog from [karanb192/cache-tax](https://github.com/karanb192/cache-tax), on its own. It doesn't keep the cache warm and draws nothing above the prompt. If you want keepwarm too, install the upstream cache-tax instead.

## Getting started

1. In the Claude desktop app's Code tab or in a terminal session, run `/plugin marketplace add mgstegmaier/claude-plugins`. You only need this once.
2. Run `/plugin install cache-guard@mgstegmaier`.
3. Run `/reload-plugins`, or start a new session.

You need Claude Code 2.1.287 or later. If any cache-tax is also installed, including this repo's old fork, cache-guard says so once at session start. Uninstall cache-tax, or run `/cache-tax guard warn`, so a cold send isn't guarded twice.

## How the cost is estimated

The estimate is the context's token count times the one-hour cache-write rate for the model the last turn used. The price table in `hooks/register.ts` holds list prices from September 2026. A model it doesn't recognize shows `n/a` for the cost, and the dialog still appears.

## Tests

Run from the repository root:

```sh
claude plugin test plugins/cache-guard
```

## License

MIT. The guard logic is adapted from [karanb192/cache-tax](https://github.com/karanb192/cache-tax) 2.2.1 by Karan Bansal; his license is in `LICENSE`.
