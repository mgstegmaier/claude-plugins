import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Snapshot } from '../types'
import { barCells, barSvg, fmt, pillColor, toSnapshot } from './split'

const snapshot = atom({ plugin: 'context-band', key: 'snapshot' } as const, null)
const isOpen = atom({ plugin: 'context-band', key: 'isOpen' } as const, false) // collapsed each session

async function refresh($: EngineInterface) {
  try {
    const usage = await $.session.usage({ breakdown: 'summary' }) // local estimate, no API calls
    const b = usage.context.breakdown
    if (!b) return
    const messages = await $.session.messages({ as: 'api' })
    const next: Snapshot = { ...toSnapshot(b, messages), ...(usage.cost ? { cost: usage.cost.usd } : {}) }
    await update($, snapshot, () => next)
  } catch {
    // a missed refresh keeps the last card; the next turn tries again
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'terminal') || e.props.hasSurvey) return next(e)
    const s = await read($, snapshot)
    if (!s) return next(e)
    const open = await read($, isOpen)

    const { Box, Button, Text } = $.ui.resolve(e)
    const Svg = e.surface === 'desktop' ? $.ui.resolve(e).Svg : undefined // the terminal has no Svg; it gets a text bar
    // legend biggest first, free last; the bar keeps family order so its colors stay grouped
    const legend = [...s.slices.filter(x => x.label !== 'free').sort((a, b) => b.tokens - a.tokens), ...s.slices.filter(x => x.label === 'free')]
    const inner = e.props.bodyColumns - 4 // the card's border and padding take 4 columns
    const half = Math.floor(inner / 2) // where the right column starts
    const rows: (typeof s.slices)[] = []
    for (let i = 0; i < legend.length; i += 2) rows.push(legend.slice(i, i + 2))

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="#b0aea5" borderDimColor paddingX={1} gap={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row">
            <Text color="#d97757">◆ </Text>
            <Button key="toggle" plain label={`context ${open ? '▾' : '▸'}`} onPress={() => update($, isOpen, v => !v)} />
            {open ? <Text dimColor>  hover a row for detail</Text> : null}
          </Box>
          <Text>
            <Text bold>{fmt(s.used)}</Text>
            <Text dimColor> of {fmt(s.window)}{s.threshold ? ` · compacts at ${fmt(s.threshold)}` : ''}{s.cost !== undefined ? ` · ~$${s.cost.toFixed(2)}` : ''}  </Text>
            <Text bold color="#141413" backgroundColor={pillColor(s.percent)}> {s.percent}% </Text>
          </Text>
        </Box>
        {Svg
          ? <Svg source={barSvg(s)} alt={`context ${s.percent}% full`} height={10} isInteractive />
          : <Text>{barCells(s, e.props.bodyColumns - 4).map((r, i) => <Text key={i} color={r.color}>{r.text}</Text>)}</Text>}
        {open && (<Box flexDirection="column">
          {rows.map((row, i) => (
            <Box key={`row-${row[0]!.label}`} flexDirection="row">
              {row.map((sl, col) => (
                <Box key={sl.label} width="50%">
                  <Text wrap="truncate" hover={{ underline: true }}>
                    <Text color={sl.color}>■ </Text>
                    <Text>{sl.label} </Text>
                    <Text bold>{fmt(sl.tokens)}</Text>
                    {sl.label === 'free' ? null : <Text dimColor> {sl.percent}%</Text>}
                    {sl.note ? <Text dimColor> · {sl.note}</Text> : null}
                  </Text>
                  {/* hidden card in the row's own keyed Box, placed down into the slot under the legend */}
                  {sl.detail ? (
                    <Box position="absolute" top={rows.length - i + 1} left={col ? -half : 0} width={inner} height={2} display="none" hover={{ display: 'flex' }}>
                      <Text wrap="wrap"><Text bold color={sl.color}>{sl.label}</Text> {sl.detail}</Text>
                    </Box>
                  ) : null}
                </Box>
              ))}
            </Box>
          ))}
          {/* ponytail: a fixed two-row slot the cards paint into, so a hover never reflows the band; a longer detail is cut.
              Empty on purpose: anything drawn in it would show through a card */}
          <Box height={2} marginTop={1} />
        </Box>)}
      </Box>
    )
  })
}
