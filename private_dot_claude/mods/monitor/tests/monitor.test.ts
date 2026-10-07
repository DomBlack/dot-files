import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const callTool = ($: Engine, call: Record<string, unknown>) =>
  ($.tool.call as unknown as (input: unknown) => Promise<unknown>)(call)

const PANE = {
  plugin: 'monitor',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'monitor',
  props: {
    title: 'Monitor',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

const SPAWN = {
  tool_use_id: 'toolu_1',
  prompt: 'Find every caller of foo.',
  description: 'Find callers of foo',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
} as const

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type Live = { id: string; description: string; type: string; status: string; name?: string; teammateId?: string }

function world(on: On, options: { now?: number; usd?: number; skip?: string[] } = {}) {
  const clock = mock.clock(on, { now: options.now ?? 10_000 })
  const skip = new Set(options.skip ?? [])
  let n = 0
  const live: Live[] = []
  if (!skip.has('agent.spawn')) {
    on('agent.spawn', ($, e) => {
      const agentId = `agent-${++n}`
      live.push({ id: agentId, description: e.description, type: e.subagentType, status: 'running' })
      return { agentId, model: e.model ?? 'claude-sonnet-5-5' }
    })
  }
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  if (!skip.has('model.complete')) on('model.complete', () => ({ value: { isAnswered: true, text: 'It looks like a test is running. Shall I hold the clipboard?', usage: USAGE } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 1_000, context: { window: 1_000_000 }, rateLimits: [], cost: { usd: options.usd ?? 0.31 } },
  }))
  if (!skip.has('ui.panes')) on('ui.panes', () => ({ value: [] }))
  if (!skip.has('ui.open')) on('ui.open', () => ({ value: { isPlaced: true } }))
  if (!skip.has('agent.list')) on('agent.list', () => ({ value: live as never }))
  if (!skip.has('session.messages')) on('session.messages', () => ({ value: [] }))
  return { clock, live }
}

async function stepFor($: Engine, agentId: string | undefined, model = 'claude-sonnet-5-5') {
  const stream = $.turn.step({ turnId: `turn-${agentId ?? 'main'}`, index: 0, model, messageCount: 1, agentId })
  for await (const _ of stream) {
    void _
  }
}

function stepsBottom(on: On) {
  const script: { chunks: unknown[] } = { chunks: [] }
  on('turn.step', async function* ($, e) {
    for (const chunk of script.chunks) yield chunk as never
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return script
}

test('the tree nests a child under its parent, newest first, with the main session as root', async ($, on) => {
  world(on)
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$0.31 · no subagents yet')
  expect((await ui.find({ key: 'node-main' }))?.text).toContain('main session')
  expect((await ui.find({ key: 'detail-main' }))?.text).toContain('opus-5-5')
  expect((await ui.find({ key: 'detail-main' }))?.text).toContain('$0.31')
  expect((await ui.find({ key: 'usage-main' }))?.text).toBe('0 in · 0 cached · 0 out')

  await $.agent.spawn(SPAWN)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_2', description: 'Check wire graph', subagentType: 'general-purpose', parentAgentId: 'agent-1' })
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$0.31 · 2 running')
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('Explore')
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('Find callers of foo')
  expect((await ui.find({ key: 'node-agent-2' }))?.text).toContain('Check wire graph')
  expect((await ui.find({ key: 'indent-agent-1' }))?.text).toBe('└─ ')
  expect((await ui.find({ key: 'indent-agent-2' }))?.text).toBe('   └─ ')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('sonnet-5-5')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('running')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('≈$0.00')

  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_3', description: 'Review the diff', subagentType: 'Plan', parentAgentId: 'agent-1' })
  expect((await ui.find({ key: 'indent-agent-3' }))?.text).toBe('   ├─ ')
  expect((await ui.find({ key: 'indent-agent-2' }))?.text).toBe('   └─ ')
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_4', description: 'Newest root', subagentType: 'Plan' })
  expect((await ui.find({ key: 'indent-agent-4' }))?.text).toBe('├─ ')
  expect((await ui.find({ key: 'indent-agent-1' }))?.text).toBe('└─ ')
  await ui.unmount()
})

test('elapsed time ticks, and a finished agent collapses to one line', async ($, on) => {
  const { clock } = world(on)
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn(SPAWN)
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('0:00')
  await clock.advance(65_000)
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('1:05')
  await clock.advance(5_000)
  await $.turn.complete({ answer: 'Done.', durationMs: 70_000, isAborted: false, turnId: 't1', agentId: 'agent-1', reason: 'answer' })
  expect(await ui.find({ key: 'detail-agent-1' })).toBeUndefined()
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toBe('└─ ✓ Explore · Find callers of foo · 1:10 · ≈$0.00')
  await clock.advance(60_000)
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('1:10')
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$0.31 · 1 done')

  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_2' })
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_3' })
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: true, turnId: 't2', agentId: 'agent-2', reason: 'aborted' })
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't3', agentId: 'agent-3', reason: 'error' })
  expect((await ui.find({ key: 'node-agent-2' }))?.text).toContain('■')
  expect((await ui.find({ key: 'node-agent-3' }))?.text).toContain('✗')
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$0.31 · 1 done · 1 failed · 1 killed')
  await ui.unmount()
})

test('an agent the engine no longer lists, with no completing turn, is shown as killed', async ($, on) => {
  const { clock, live } = world(on)
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn(SPAWN)
  await clock.advance(2_000)
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('running')
  live.length = 0
  await clock.advance(2_000)
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('running')
  await clock.advance(3_000)
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('■')
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('0:06')
  await clock.advance(10_000)
  expect((await ui.find({ key: 'node-agent-1' }))?.text).toContain('0:06')
  await ui.unmount()
})

test('cost is priced from the stop chunks of each agent, and the summary totals it with the main session', async ($, on) => {
  world(on, { usd: 0.5 })
  const script = stepsBottom(on)
  script.chunks = [{ kind: 'stop', ref: 0, stopReason: 'end_turn', usage: { model: 'claude-sonnet-5-5', input_tokens: 1_000, output_tokens: 500, cache_read_input_tokens: 10_000, cache_creation_input_tokens: 0 } }]
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn(SPAWN)
  await stepFor($, 'agent-1')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('≈$0.01')
  await stepFor($, 'agent-1')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('≈$0.02')
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$0.52 · 1 running')
  await stepFor($, undefined)
  expect((await ui.find({ key: 'usage-main' }))?.text).toBe('1.0k in · 10.0k cached · 500 out')

  await $.ui.press({ plugin: 'monitor', key: 'press-agent-1', requestId: 'monitor' })
  expect((await ui.find({ key: 'usage-agent-1' }))?.text).toBe('≈$0.02 · 2.0k in · 20.0k cached · 1.0k out')
  await ui.unmount()
})

test('the activity line follows tool calls, thinking and text', async ($, on) => {
  world(on)
  const script = stepsBottom(on)
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn(SPAWN)

  await callTool($, { tool: 'Edit', tool_use_id: 'toolu_2', agentId: 'agent-1', file_path: '/repo/platform/foo.go', old_string: 'a', new_string: 'b' })
  expect((await ui.find({ key: 'activity-agent-1' }))?.text).toContain('editing platform/foo.go')
  await callTool($, { tool: 'Bash', tool_use_id: 'toolu_3', agentId: 'agent-1', command: 'go test ./s_user/...' })
  expect((await ui.find({ key: 'activity-agent-1' }))?.text).toContain('running go test ./s_user/...')
  expect((await ui.find({ key: 'detail-agent-1' }))?.text).toContain('2 tools')
  await callTool($, { tool: 'Read', tool_use_id: 'toolu_4', file_path: '/repo/README.md' })
  expect((await ui.find({ key: 'activity-main' }))?.text).toContain('reading repo/README.md')

  script.chunks = [
    { kind: 'thinking', ref: 0, index: 0, text: 'The caller graph has three entry points, so ' },
    { kind: 'thinking', ref: 1, index: 0, text: 'I should check each one.' },
  ]
  await stepFor($, 'agent-1')
  expect((await ui.find({ key: 'activity-agent-1' }))?.text).toContain('thinking: The caller graph has three entry points')

  script.chunks = [{ kind: 'text', ref: 0, index: 0, text: 'Found three callers of foo.' }]
  await stepFor($, 'agent-1')
  expect((await ui.find({ key: 'activity-agent-1' }))?.text).toContain('Found three callers of foo.')
  await ui.unmount()
})

test('pressing an agent drills into its transcript and the back button returns to the tree', async ($, on) => {
  world(on, { skip: ['session.messages'] })
  on('session.messages', ($, e) => ({
    value: e.agentId === 'agent-1'
      ? [
          { role: 'user', text: 'Find every caller of foo.', toolUses: [] },
          { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'x', tool: 'Bash', input: { command: 'rg foo' }, text: 'a.go\nb.go' }] },
          { role: 'assistant', text: 'There are two callers.', toolUses: [] },
        ]
      : [],
  }))
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn(SPAWN)
  expect(await ui.find({ key: 'press-agent-1' })).toBeDefined()
  await $.ui.press({ plugin: 'monitor', key: 'press-agent-1', requestId: 'monitor' })
  expect(await ui.find({ key: 'back' })).toBeDefined()
  expect(await ui.find({ key: 'transcript' })).toBeDefined()
  expect(await ui.find({ text: /rg foo/ })).toBeDefined()
  expect(await ui.find({ text: /There are two callers\./ })).toBeDefined()
  expect(await ui.find({ key: 'node-main' })).toBeUndefined()
  await $.ui.press({ plugin: 'monitor', key: 'back', requestId: 'monitor' })
  expect(await ui.find({ key: 'node-main' })).toBeDefined()
  expect(await ui.find({ key: 'back' })).toBeUndefined()
  await ui.unmount()
})

test('a spawn opens the pane only while it is closed', async ($, on) => {
  const opened: string[] = []
  world(on, { skip: ['ui.panes', 'ui.open'] })
  let isOpen = false
  on('ui.panes', () => ({ value: isOpen ? [{ id: 'monitor', title: 'Monitor', isShown: true, isFocused: false, isPlaced: true }] : [] }))
  on('ui.open', ($, e) => {
    opened.push(e.id)
    isOpen = true
    return { value: { isPlaced: true } }
  })
  await $.agent.spawn(SPAWN)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_2' })
  expect(opened).toEqual(['monitor'])
  isOpen = false
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_3' })
  expect(opened).toEqual(['monitor', 'monitor'])
})

test('an entry recorded by an older version of the mod still draws', async ($, on) => {
  world(on)
  const old = [{ id: 'old-1', description: 'Old task', type: 'Explore', status: 'completed', startedAt: 1_000, endedAt: 5_000, toolCalls: 3 }]
  on('state.get', { plugin: 'monitor', key: 'agents' }, () => ({ value: { value: old, version: 1 } }) as never)
  const ui = await $.ui.mount(PANE)
  expect((await ui.find({ key: 'node-old-1' }))?.text).toBe('└─ ✓ Explore · Old task · 0:04 · ≈$0.00')
  expect(await ui.find({ text: /monitor: / })).toBeUndefined()
  await ui.unmount()
})

test('the tree scrolls inside the top section with hints outside the window, and Clippy sits below it', async ($, on) => {
  const { clock } = world(on)
  const short = { ...PANE, props: { ...PANE.props, scroll: { offset: 0, bodyRows: 24 } } }
  const ui = await $.ui.mount(short)
  expect((await ui.find({ key: 'clippy' }))?.text).toContain("It looks like you're writing a prompt")
  await $.turn.start({ text: 'go', turnId: 'turn-main' })
  for (let i = 1; i <= 5; i++) await $.agent.spawn({ ...SPAWN, tool_use_id: `toolu_${i}`, description: `Task ${i}` })
  expect((await ui.find({ key: 'clippy' }))?.text).toContain('It looks like a test is running')
  expect(await ui.find({ key: 'more-above' })).toBeUndefined()
  expect((await ui.find({ key: 'more-below' }))?.text).toBe('▼ 8 more')
  expect(await ui.find({ key: 'node-agent-5' })).toBeDefined()
  expect(await ui.find({ key: 'node-agent-1' })).toBeUndefined()

  const move = (by: number, row?: number) =>
    $.ui.scroll({ component: 'Pane', requestId: 'monitor', offset: 0, by, bodyRows: 24, contentRows: 24, origin: { kind: 'person' }, pointer: row === undefined ? undefined : { column: 0, row } })
  await move(3)
  expect((await ui.find({ key: 'more-above' }))?.text).toBe('▲ 3 more')
  expect((await ui.find({ key: 'more-below' }))?.text).toBe('▼ 6 more')
  await move(100)
  expect(await ui.find({ key: 'more-below' })).toBeUndefined()
  expect((await ui.find({ key: 'more-above' }))?.text).toBe('▲ 9 more')
  expect(await ui.find({ key: 'node-agent-1' })).toBeDefined()
  await move(-1, 20)
  expect((await ui.find({ key: 'more-above' }))?.text).toBe('▲ 9 more')
  await move(-100)
  expect(await ui.find({ key: 'more-above' })).toBeUndefined()
  expect(await ui.find({ key: 'node-agent-5' })).toBeDefined()
  await ui.unmount()
})

test('Clippy refreshes in the background at most every 25 seconds while the session changes', async ($, on) => {
  const { clock } = world(on, { skip: ['model.complete'] })
  const asked: string[] = []
  on('model.complete', ($, e) => {
    asked.push(e.prompt)
    return { value: { isAnswered: true, text: `It looks like quip ${asked.length}.`, usage: USAGE } }
  })
  const short = { ...PANE, props: { ...PANE.props, scroll: { offset: 0, bodyRows: 24 } } }
  const ui = await $.ui.mount(short)
  await $.turn.start({ text: 'go', turnId: 'turn-main' })
  await $.agent.spawn(SPAWN)
  await clock.settle()
  expect(asked).toHaveLength(1)
  expect(asked[0]).toContain('sent a prompt: "go"')
  expect((await ui.find({ key: 'clippy' }))?.text).toContain('It looks like quip 1.')

  await clock.advance(5_000)
  expect(asked).toHaveLength(2)
  expect(asked[1]).toContain('A new subagent started')
  expect(asked[1]).toContain('- Explore agent: Find callers of foo')

  await callTool($, { tool: 'Read', tool_use_id: 'toolu_9', file_path: '/repo/README.md' })
  await clock.advance(10_000)
  expect(asked).toHaveLength(2)
  await clock.advance(15_000)
  expect(asked).toHaveLength(3)
  expect(asked[2]).not.toContain('What just happened')
  expect(asked[2]).toContain('Claude (main session) is currently reading repo/README.md')
  expect(asked[2]).toContain(`The developer's last prompt: "go"`)
  expect((await ui.find({ key: 'clippy' }))?.text).toContain('It looks like quip 3.')

  await clock.advance(60_000)
  expect(asked).toHaveLength(3)
  await ui.unmount()
})

test('Clippy reacts at once to a prompt, an agent starting or ending, and the spend crossing a mark', async ($, on) => {
  const opts = { usd: 0.4, skip: ['model.complete'] }
  const { clock } = world(on, opts)
  const asked: string[] = []
  on('model.complete', ($, e) => {
    asked.push(e.prompt)
    return { value: { isAnswered: true, text: `It looks like quip ${asked.length}.`, usage: USAGE } }
  })
  const ui = await $.ui.mount(PANE)

  await $.turn.start({ text: 'why is the deploy slow?', turnId: 'turn-main' })
  await clock.settle()
  expect(asked).toHaveLength(1)
  expect(asked[0]).toContain('What just happened: The developer just sent a prompt: "why is the deploy slow?"')

  await $.agent.spawn(SPAWN)
  await clock.settle()
  expect(asked).toHaveLength(1)
  await clock.advance(5_000)
  expect(asked).toHaveLength(2)
  expect(asked[1]).toContain('A new subagent started: Explore on sonnet-5-5, task "Find callers of foo"')

  await clock.advance(5_000)
  await $.turn.complete({ answer: 'Two callers.', durationMs: 1, isAborted: false, turnId: 'a1', agentId: 'agent-1', reason: 'answer' })
  await clock.settle()
  expect(asked).toHaveLength(3)
  expect(asked[2]).toContain('Subagent Explore (Find callers of foo) finished after 0:10, saying: Two callers.')

  await clock.advance(5_000)
  opts.usd = 1.2
  await clock.advance(1_000)
  expect(asked).toHaveLength(4)
  expect(asked[3]).toContain("The session's total spend just passed $1 (it is $1.20 now)")
  opts.usd = 4.9
  await clock.advance(6_000)
  expect(asked).toHaveLength(4)
  opts.usd = 5.1
  await clock.advance(1_000)
  expect(asked).toHaveLength(5)
  expect(asked[4]).toContain('just passed $5')
  opts.usd = 260
  await clock.advance(6_000)
  expect(asked).toHaveLength(6)
  expect(asked[5]).toContain('just passed $200')
  opts.usd = 290
  await clock.advance(6_000)
  expect(asked).toHaveLength(6)
  await ui.unmount()
})

test('a teammate is tracked by its team address and its ledger is read from its transcript file', async ($, on) => {
  const { clock, live } = world(on, { skip: ['agent.spawn'] })
  on('agent.spawn', ($, e) => {
    live.push({ id: 'scout@session-28a82511', description: e.description, type: e.subagentType, status: 'running', name: 'scout', teammateId: 'scout@session-28a82511' })
    return { agentId: 'scout@session-28a82511', teammateId: 'scout@session-28a82511', model: 'fable' }
  })
  on('env.get', () => ({ value: '/home/dom' }))
  on('session.cwd', () => ({ value: '/Users/dom/src/repo' }))
  on('session.id', () => ({ value: '28a82511-0225-4b62-8cbd-9c8259a4f8fc' }))
  const childRows: { rows: unknown[]; mtimeMs: number } = {
    rows: [
      { type: 'user', timestamp: '2026-10-07T10:00:12.000Z', message: { role: 'user', content: 'List the files.' } },
      { type: 'assistant', timestamp: '2026-10-07T10:00:14.000Z', message: { role: 'assistant', model: 'claude-haiku-4-5', usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, content: [{ type: 'tool_use', name: 'Glob', input: { pattern: '**/*.go' } }] } },
    ],
    mtimeMs: 14_000,
  }
  on('fs.list', ($, e) => ({
    value: e.path.endsWith('/mate/subagents')
      ? [{ name: 'agent-abc.jsonl', kind: 'file', size: 10, mtimeMs: childRows.mtimeMs, isLink: false }, { name: 'agent-abc.meta.json', kind: 'file', size: 10, mtimeMs: childRows.mtimeMs, isLink: false }]
      : [{ name: 'other.jsonl', kind: 'file', size: 10, mtimeMs: 20_000, isLink: false }, { name: 'mate.jsonl', kind: 'file', size: 10, mtimeMs: 20_000, isLink: false }],
  }))
  const rows = [
    { type: 'agent-setting', agentSetting: 'general-purpose', sessionId: 'x' },
    { type: 'user', teamName: 'session-28a82511', agentName: 'scout', message: { role: 'user', content: 'Count the files.' } },
    { type: 'assistant', teamName: 'session-28a82511', agentName: 'scout', message: { role: 'assistant', model: 'claude-fable-5-1', usage: { input_tokens: 226, output_tokens: 626, cache_read_input_tokens: 689_905, cache_creation_input_tokens: 44_878 }, content: [{ type: 'tool_use', name: 'Bash', input: { command: 'ls | wc -l' } }] } },
    { type: 'assistant', teamName: 'session-28a82511', agentName: 'scout', message: { role: 'assistant', model: 'claude-fable-5-1', usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, content: [{ type: 'text', text: 'There are 42 files.' }] } },
    { type: 'cost-state', totalCostUSD: 3.5 },
  ]
  const other = [{ type: 'user', teamName: 'session-28a82511', agentName: 'someone-else', message: { role: 'user', content: 'x' } }]
  on('fs.read', ($, e) => ({
    value: e.path.endsWith('/mate.jsonl')
      ? rows.map(r => JSON.stringify(r)).join('\n')
      : e.path.endsWith('agent-abc.jsonl')
        ? childRows.rows.map(r => JSON.stringify(r)).join('\n')
        : e.path.endsWith('agent-abc.meta.json')
          ? JSON.stringify({ agentType: 'Explore', description: 'List files', spawnDepth: 2 })
          : other.map(r => JSON.stringify(r)).join('\n'),
  }))
  const ui = await $.ui.mount(PANE)
  await $.agent.spawn({ ...SPAWN, subagentType: 'general-purpose', name: 'scout', isTeammate: true, description: 'Count files' })
  const key = 'node-scout@session-28a82511'
  expect((await ui.find({ key }))?.text).toContain('scout')
  await clock.advance(5_000)
  expect((await ui.find({ key: 'detail-scout@session-28a82511' }))?.text).toBe('   fable-5-1 · 0:05 · running · ≈$3.50 · 1 tool')
  expect((await ui.find({ key: 'activity-scout@session-28a82511' }))?.text).toContain('There are 42 files.')
  expect((await ui.find({ key: 'indent-abc' }))?.text).toBe('   └─ ')
  expect((await ui.find({ key: 'node-abc' }))?.text).toContain('Explore')
  expect((await ui.find({ key: 'node-abc' }))?.text).toContain('List files')
  expect((await ui.find({ key: 'detail-abc' }))?.text).toContain('haiku-4-5')
  expect((await ui.find({ key: 'detail-abc' }))?.text).toContain('running')
  expect((await ui.find({ key: 'detail-abc' }))?.text).toContain('1 tool')
  expect((await ui.find({ key: 'activity-abc' }))?.text).toContain('searching **/*.go')
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$3.81 · 2 running')
  childRows.rows.push({ type: 'assistant', timestamp: '2026-10-07T10:00:20.000Z', message: { role: 'assistant', model: 'claude-haiku-4-5', usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, content: [{ type: 'text', text: 'Twelve files.' }] } })
  childRows.mtimeMs = 20_000
  await clock.advance(13_000)
  expect((await ui.find({ key: 'node-abc' }))?.text).toContain('✓')
  expect((await ui.find({ key: 'node-abc' }))?.text).toContain('0:08')
  expect((await ui.find({ key: 'summary' }))?.text).toBe('$3.81 · 1 running · 1 done')
  await $.ui.press({ plugin: 'monitor', key: 'press-scout@session-28a82511', requestId: 'monitor' })
  expect((await ui.find({ key: 'usage-scout@session-28a82511' }))?.text).toBe('≈$3.50 · 45.1k in · 689.9k cached · 646 out · teammate, read from its transcript')
  expect(await ui.find({ text: /» running ls \| wc -l/ })).toBeDefined()
  await ui.unmount()
})

test('/monitor opens the pane', async ($, on) => {
  world(on, { skip: ['ui.open'] })
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const ran = await $.command.run({ command: 'monitor', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } })
  expect(ran.text).toBe('Monitor pane opened.')
  expect(opened).toEqual(['monitor'])
})
