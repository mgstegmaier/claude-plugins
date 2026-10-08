// The changes section: what this session did outside the machine, which files it edited,
// and whether a check ran after the last edit. Read from each tool call's input and result.
import type { Effect, Stats } from '../types'

// ponytail: a list of known shapes, not a judgment of every command. A side effect it doesn't
// name is missed; add its shape here when one slips through.
const OUTSIDE = new RegExp(
  [
    String.raw`\bgit\s+(push|reset\s+--hard|branch\s+-D|worktree\s+remove|stash\s+(drop|clear)|clean\s+-\w*f)\b`,
    String.raw`\bgh\s+(pr\s+(create|merge|close|edit|comment|review)|issue\s+(create|close|edit|comment)|release\s+create|repo\s+(create|delete)|api\b.*-X\s*(POST|PUT|PATCH|DELETE))`,
    String.raw`(^|[;&|]\s*)rm\s`,
    String.raw`\bcurl\b.*(-X\s*(POST|PUT|PATCH|DELETE)|--data\b|\s-d\s)`,
    String.raw`\bclaude\s+plugin\s+(install|uninstall|enable|disable|update|marketplace\s+(add|remove|update))\b`,
    String.raw`\b(npm|pnpm|yarn)\s+publish\b|\bdocker\s+push\b|\bkubectl\s+(apply|delete)\b|\bterraform\s+(apply|destroy)\b|\bastro\s+deploy\b`,
  ].join('|'),
)
// An MCP tool whose name says it writes: mcp__<server>__<create_item>.
const MCP_WRITE = /^mcp__(.+?)__((create|update|delete|send|post|merge|publish|add|edit|set|change|move|transition|remove|write|upload)\w*)$/i
// A command that checks work: tests, lint, type checks, builds, plugin validation.
const CHECK = /\b(pytest|jest|vitest|mocha|ruff|eslint|tsc|mypy|pylint|flake8|(npm|pnpm|yarn|bun)\s+(run\s+)?(test|lint|build|check|typecheck)|cargo\s+(test|check|clippy)|go\s+(test|vet)|make\s+(test|check|lint)|claude\s+plugin\s+(test|validate)|dbt\s+(test|build))\b/
export const WRITERS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const MAX_EFFECTS = 50
const MAX_FILES = 40

const firstLine = (t: string) => t.trim().split('\n')[0]?.slice(0, 160) ?? ''

/** What one finished tool call adds to the changes section; nothing when it adds nothing. */
export function footprint(s: Stats, tool: string, input: Record<string, unknown>, at: number, hasFailed: boolean, agent: string | null): Partial<Stats> {
  const change: Partial<Stats> = {}
  const effect = (text: string) => {
    const row: Effect = { at, text, isFailed: hasFailed, agent }
    change.effects = [...s.effects, row].slice(-MAX_EFFECTS)
  }

  if (tool === 'Bash') {
    const command = `${input.command ?? ''}`
    if (OUTSIDE.test(command)) effect(firstLine(command))
    if (CHECK.test(command)) change.lastCheck = { at, isPassed: !hasFailed, text: firstLine(command) }
  }
  const mcp = MCP_WRITE.exec(tool)
  if (mcp !== null && !tool.startsWith('mcp__tether__')) effect(`${mcp[1]} ${mcp[2]}`)

  if (!hasFailed && WRITERS.includes(tool)) {
    const path = `${input.file_path ?? input.notebook_path ?? ''}`
    if (path !== '') {
      const before = s.touched.find(one => one.path === path)
      change.touched = [...s.touched.filter(one => one.path !== path), { path, edits: (before?.edits ?? 0) + 1, at }].slice(-MAX_FILES)
      change.lastEditAt = at
    }
  }

  return change
}

/** Whether the work was checked after the last edit: no edits yet, passed, failed, or not run. */
export function checkState(s: Pick<Stats, 'touched' | 'lastEditAt' | 'lastCheck'>): 'none' | 'passed' | 'failed' | 'unchecked' {
  if (s.touched.length === 0) return 'none'
  if (s.lastCheck === null || s.lastCheck.at < s.lastEditAt) return 'unchecked'
  return s.lastCheck.isPassed ? 'passed' : 'failed'
}
