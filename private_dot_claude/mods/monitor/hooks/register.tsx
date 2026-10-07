import { atom, read, update } from 'claude-code'
import type { EngineInterface, Events, Register, RenderElement, SessionMessage, Timer } from 'claude-code'

import type { Quip, RootInfo, Subagent, SubagentStatus, Usage } from '../types'

const PANE = 'monitor'
const TITLE = 'Monitor'
const TICK_MS = 1000
const COLUMNS = 56
const ACTIVITY_CHARS = 90
const NAME_CHARS = 24
const GONE_AFTER_MS = 5000
const MIN_TREE_ROWS = 6
const QUIP_EVERY_MS = 25_000
const QUIP_EVENT_FLOOR_MS = 5_000
const QUIP_MODEL = 'haiku'
const COST_MARKS = [1, 5, 10, 25, 50, 100]
const LEDGER_EVERY_MS = 4000
const LEDGER_SNIFF_CHARS = 4000
const SCROLL_TO_END = 1_000_000

const agents = atom({ plugin: 'monitor', key: 'agents' } as const, [])
const root = atom({ plugin: 'monitor', key: 'root' } as const, { costUsd: 0, isWorking: false })
const now = atom({ plugin: 'monitor', key: 'now' } as const, 0)
const view = atom({ plugin: 'monitor', key: 'view' } as const, null)
const scroll = atom({ plugin: 'monitor', key: 'scroll' } as const, 0)
const quip = atom({ plugin: 'monitor', key: 'quip' } as const, null)
const costMark = atom({ plugin: 'monitor', key: 'costMark' } as const, 0)

const NO_USAGE: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

function normalise(a: Partial<Subagent> & { id: string }): Subagent {
  return {
    id: a.id,
    parentId: a.parentId,
    description: a.description ?? '',
    type: a.type ?? 'agent',
    name: a.name,
    model: a.model,
    isTeammate: a.isTeammate,
    source: a.source,
    status: a.status ?? 'running',
    startedAt: a.startedAt ?? 0,
    endedAt: a.endedAt,
    toolCalls: a.toolCalls ?? 0,
    activity: a.activity,
    usage: a.usage ?? NO_USAGE,
    costUsd: a.costUsd ?? 0,
  }
}

async function readAgents($: EngineInterface): Promise<Subagent[]> {
  const list = await read($, agents)
  return list.map(normalise)
}

const isEnded = (status: SubagentStatus) =>
  status === 'completed' || status === 'failed' || status === 'killed'

const isLive = (status: SubagentStatus) => !isEnded(status)

const GLYPH: Record<SubagentStatus, string> = {
  pending: '○',
  running: '●',
  waiting: '◐',
  idle: '◦',
  completed: '✓',
  failed: '✗',
  killed: '■',
}

const STATUS_COLOR: Record<SubagentStatus, string> = {
  pending: 'subtle',
  running: 'success',
  waiting: 'warning',
  idle: 'subtle',
  completed: 'success',
  failed: 'error',
  killed: 'warning',
}

const STATUS_WORD: Record<SubagentStatus, string> = {
  pending: 'pending',
  running: 'running',
  waiting: 'waiting',
  idle: 'idle',
  completed: 'done',
  failed: 'failed',
  killed: 'killed',
}

const PRICES: ReadonlyArray<readonly [RegExp, number, number]> = [
  [/fable-5|mythos-5/, 10, 50],
  [/opus-5-5/, 4, 20],
  [/opus-5|opus-4/, 5, 25],
  [/sonnet-5/, 2, 10],
  [/sonnet-4/, 3, 15],
  [/haiku/, 1, 5],
]

const ALIASES: Record<string, string> = {
  sonnet: 'sonnet-5-5',
  opus: 'opus-5-5',
  haiku: 'haiku-4-5',
  fable: 'fable-5-1',
}

function shortModel(model: string | undefined): string {
  if (!model) return '?'
  const bare = model
    .toLowerCase()
    .replace(/^.*anthropic\./, '')
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '')
    .replace(/\[.*\]$/, '')
  return ALIASES[bare] ?? bare
}

function costOf(usage: Usage, model: string | undefined): number {
  const short = shortModel(model)
  const [, input, output] = PRICES.find(([re]) => re.test(short)) ?? [/./, 4, 20]
  const perToken = (usdPerMillion: number) => usdPerMillion / 1_000_000
  return (
    usage.input * perToken(input) +
    usage.output * perToken(output) +
    usage.cacheRead * perToken(input) * 0.1 +
    usage.cacheWrite * perToken(input) * 1.25
  )
}

function tokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function tokenLine(usage: Usage): string {
  return `${tokens(usage.input + usage.cacheWrite)} in · ${tokens(usage.cacheRead)} cached · ${tokens(usage.output)} out`
}

function addedUsage(a: Usage, b: Usage): Usage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

function elapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  const words = text.split(/\s+/).filter(Boolean).flatMap(word => {
    const parts: string[] = []
    for (let i = 0; i < word.length; i += width) parts.push(word.slice(i, i + width))
    return parts
  })
  for (const word of words) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

function relPath(path: string): string {
  return path.split('/').filter(Boolean).slice(-2).join('/')
}

function describeTool(tool: string, args: Record<string, unknown>): string {
  const str = (key: string) => (typeof args[key] === 'string' ? (args[key] as string) : undefined)
  const file = str('file_path') ?? str('notebook_path')
  switch (tool) {
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return `editing ${file ? relPath(file) : ''}`
    case 'Read':
      return `reading ${file ? relPath(file) : ''}`
    case 'Bash':
      return `running ${str('command') ?? ''}`
    case 'Grep':
    case 'Glob':
      return `searching ${str('pattern') ?? ''}`
    case 'WebSearch':
      return `searching ${str('query') ?? ''}`
    case 'WebFetch':
      return `fetching ${str('url') ?? ''}`
    case 'Agent':
      return `spawning ${str('description') ?? str('subagent_type') ?? 'an agent'}`
    case 'Skill':
      return `using skill ${str('skill') ?? ''}`
    default:
      return tool.startsWith('mcp__') ? tool.replace(/^mcp__/, '').replace('__', ' › ') : tool
  }
}

function summary(list: readonly Subagent[], total: number): string {
  const cost = usd(total)
  if (list.length === 0) return `${cost} · no subagents yet`
  const count = (status: SubagentStatus) => list.filter(a => a.status === status).length
  const parts = [
    [count('running') + count('pending') + count('waiting'), 'running'],
    [count('idle'), 'idle'],
    [count('completed'), 'done'],
    [count('failed'), 'failed'],
    [count('killed'), 'killed'],
  ] as const
  const words = parts
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}`)
    .join(' · ')
  return `${cost} · ${words}`
}

async function setActivity($: EngineInterface, agentId: string | undefined, activity: string) {
  const text = clip(activity, ACTIVITY_CHARS)
  if (agentId === undefined) {
    await update($, root, r => ({ ...r, activity: text }))
    return
  }
  await update($, agents, list => list.map(a => (a.id === agentId ? { ...a, activity: text } : a)))
}

async function addUsage($: EngineInterface, agentId: string | undefined, usage: Usage, model: string) {
  if (agentId === undefined) {
    await update($, root, r => ({ ...r, usage: addedUsage(r.usage ?? NO_USAGE, usage) }))
    return
  }
  await update($, agents, list =>
    list.map(normalise).map(a => {
      if (a.id !== agentId) return a
      const priced = a.model ?? model
      return { ...a, model: priced, usage: addedUsage(a.usage, usage), costUsd: a.costUsd + costOf(usage, priced) }
    }),
  )
}

async function openPane($: EngineInterface) {
  const panes = await $.ui.panes().catch(() => [])
  if (panes.some(p => p.id === PANE)) return
  await $.ui.open({ id: PANE, title: TITLE, columns: COLUMNS }).catch(() => undefined)
}

async function showAgent($: EngineInterface, id: string | null) {
  await update($, view, () => id)
  await update($, scroll, () => (id === null ? 0 : SCROLL_TO_END))
}

const CLIPPY_SYSTEM =
  "You are Clippy, the Microsoft Office paperclip from 1997, now living in a developer's terminal next to Claude Code. " +
  'Two people are in the room: the developer, whom you address as "you", and Claude, the AI that does the work. ' +
  'Editing, reading, running commands, searching, thinking, spawning agents and answering are all things Claude does, never the developer: say "Claude is editing", not "you are editing". ' +
  "The developer only types prompts, reads, waits and pays the bill. Subagents are Claude's helpers. " +
  'Reply with exactly one line of at most 120 characters, in two parts. ' +
  "First an observation starting with 'It looks like', naming the specific thing happening in the session. " +
  'Then an eager, pointless offer of help that nobody wants, in the spirit of "Would you like help with that?": ' +
  'offer to write a letter, format it as a table, add a wizard, open a help topic, turn on autocorrect, and so on. Vary the offer every time. ' +
  'Chirpy, overeager, oblivious to how unhelpful you are. No quotes, no emoji, no preamble. ' +
  'When the briefing says something just happened, react to that first.'

function contextKey(info: RootInfo, list: readonly Subagent[]): string {
  const running = list.filter(a => isLive(a.status)).map(a => `${a.id}:${a.activity ?? ''}`)
  return `${info.isWorking ? 'w' : 'i'}|${info.activity ?? ''}|${running.join(',')}`
}

function clippyPrompt(info: RootInfo, list: readonly Subagent[], total: number, event: string | undefined, lastPrompt: string): string {
  const running = list.filter(a => isLive(a.status))
  const lines = [
    ...(event ? [`What just happened: ${event}`] : []),
    info.isWorking
      ? `Claude (main session) is currently ${info.activity ?? 'working'}.`
      : 'Claude is idle; the developer is reading or typing the next prompt.',
    `The developer's last prompt: "${lastPrompt || 'none yet'}".`,
    `Total spent so far: ${usd(total)}.`,
    running.length === 0 ? 'No subagents are running right now.' : `Subagents running right now: ${running.length}.`,
  ]
  for (const a of running.slice(0, 6)) lines.push(`- ${agentLabel(a)} agent: ${a.description}${a.activity ? ` (it is now ${a.activity})` : ''}`)
  return lines.join('\n')
}

let quipInFlight = false
let pendingEvent: string | undefined
let lastPrompt = ''

function costMarkFor(total: number): number {
  if (total >= 100) return Math.floor(total / 100) * 100
  return COST_MARKS.filter(mark => total >= mark).pop() ?? 0
}

type SessionFacts = { model?: string; startedAt?: number; costUsd?: number; at: number }
let sessionFacts: SessionFacts = { at: 0 }

async function refreshSessionFacts($: EngineInterface, t: number) {
  const model = await $.session.model().catch(() => undefined)
  const usage = await $.session.usage().catch(() => undefined)
  sessionFacts = { model: model ?? sessionFacts.model, startedAt: usage?.startedAt ?? sessionFacts.startedAt, costUsd: usage?.cost?.usd ?? sessionFacts.costUsd, at: t }
}

async function sessionCost($: EngineInterface): Promise<number> {
  const info: RootInfo = await read($, root)
  const list = await readAgents($)
  return (sessionFacts.costUsd ?? info.costUsd) + list.reduce((sum, a) => sum + a.costUsd, 0)
}

async function refreshQuip($: EngineInterface, t: number) {
  if (quipInFlight) return
  const info: RootInfo = await read($, root)
  const list = await readAgents($)
  const held: Quip | null = await read($, quip)
  const key = contextKey(info, list)
  const since = held ? t - held.at : Number.POSITIVE_INFINITY
  let event: string | undefined
  if (pendingEvent !== undefined) {
    if (since < QUIP_EVENT_FLOOR_MS) return
    event = pendingEvent
    pendingEvent = undefined
  } else if (held && (held.key === key || since < QUIP_EVERY_MS)) {
    return
  }
  quipInFlight = true
  try {
    const total = await sessionCost($)
    const reply = await $.model
      .complete({ model: QUIP_MODEL, system: CLIPPY_SYSTEM, prompt: clippyPrompt(info, list, total, event, lastPrompt), maxTokens: 60, effort: 'low' })
      .catch(() => undefined)
    const text = reply?.isAnswered ? clip(reply.text.split('\n')[0] ?? '', 400).replace(/^["']|["']$/g, '') : ''
    await update($, quip, q => ({ text: text || q?.text || '', at: t, key }))
  } finally {
    quipInFlight = false
  }
}

async function noteEvent($: EngineInterface, event: string) {
  pendingEvent = pendingEvent ? `${pendingEvent} Also: ${event}` : event
  const t = await $.clock.now()
  await refreshQuip($, t)
}

async function noteCost($: EngineInterface) {
  const total = await sessionCost($)
  const mark = costMarkFor(total)
  const held = await read($, costMark)
  if (mark <= held) return
  await update($, costMark, () => mark)
  await noteEvent($, `The session's total spend just passed $${mark} (it is ${usd(total)} now).`)
}

type Ledger = { usage: Usage; model?: string; costUsd?: number; toolCalls: number; activity?: string; lines: string[]; firstAt?: number; lastAt?: number; isMidTool: boolean }

let ledgerPaths = new Map<string, string>()
let ledgerLines = new Map<string, string[]>()
let ledgerAt = 0

function parseLedger(text: string): Ledger {
  const ledger: Ledger = { usage: NO_USAGE, toolCalls: 0, lines: [], isMidTool: false }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let row: Record<string, unknown>
    try {
      row = JSON.parse(line) as Record<string, unknown>
    } catch {
      continue
    }
    if (row.type === 'cost-state' && typeof row.totalCostUSD === 'number') {
      ledger.costUsd = row.totalCostUSD
      continue
    }
    if (typeof row.timestamp === 'string') {
      const at = Date.parse(row.timestamp)
      if (!Number.isNaN(at)) {
        ledger.firstAt ??= at
        ledger.lastAt = at
      }
    }
    const message = row.message as Record<string, unknown> | undefined
    if (!message) continue
    const content = message.content
    const blocks = Array.isArray(content) ? (content as Record<string, unknown>[]) : []
    if (row.type === 'assistant') {
      const usage = message.usage as Record<string, unknown> | undefined
      if (usage) {
        const n = (key: string) => (typeof usage[key] === 'number' ? (usage[key] as number) : 0)
        ledger.usage = addedUsage(ledger.usage, {
          input: n('input_tokens'),
          output: n('output_tokens'),
          cacheRead: n('cache_read_input_tokens'),
          cacheWrite: n('cache_creation_input_tokens'),
        })
        if (typeof message.model === 'string') ledger.model = message.model
      }
      ledger.isMidTool = blocks.some(block => block.type === 'tool_use')
      for (const block of blocks) {
        if (block.type === 'tool_use' && typeof block.name === 'string') {
          ledger.toolCalls += 1
          const described = describeTool(block.name, (block.input as Record<string, unknown>) ?? {})
          ledger.activity = described
          ledger.lines.push(`  » ${described}`)
        } else if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
          ledger.activity = block.text
          ledger.lines.push(`  ${block.text}`)
        }
      }
    } else if (row.type === 'user') {
      if (typeof content === 'string') {
        if (content.trim()) ledger.lines.push(`▸ ${content}`)
      } else {
        for (const block of blocks) {
          if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) ledger.lines.push(`▸ ${block.text}`)
        }
      }
    }
  }
  return ledger
}

function projectDirName(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, '-')
}

async function findLedgerFile($: EngineInterface, a: Subagent, team: string, dir: string): Promise<string | undefined> {
  const entries = await $.fs.list(dir).catch(() => [])
  const name = a.name ?? ''
  const nameMark = `"agentName":${JSON.stringify(name)}`
  const teamMark = `"teamName":${JSON.stringify(team)}`
  for (const entry of entries) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.jsonl')) continue
    if (entry.mtimeMs < a.startedAt - 60_000) continue
    const path = `${dir}/${entry.name}`
    const head = await $.fs.read(path).catch(() => '')
    const sniff = head.slice(0, LEDGER_SNIFF_CHARS)
    if (sniff.includes(nameMark) && sniff.includes(teamMark)) return path
  }
  return undefined
}

type Sidecar = { agentType?: string; description?: string; parentAgentId?: string }

const sidecars = new Map<string, Sidecar>()

function ledgerFields(entry: Subagent, ledger: Ledger): Subagent {
  return {
    ...entry,
    model: ledger.model ?? entry.model,
    usage: ledger.usage,
    costUsd: ledger.costUsd ?? costOf(ledger.usage, ledger.model ?? entry.model),
    toolCalls: ledger.toolCalls,
    activity: ledger.activity ? clip(ledger.activity, ACTIVITY_CHARS) : entry.activity,
  }
}

async function discoverChildren($: EngineInterface, parent: Subagent, parentPath: string, dir: string, t: number) {
  const sid = parentPath.split('/').pop()?.replace(/\.jsonl$/, '') ?? ''
  if (!sid) return
  const subDir = `${dir}/${sid}/subagents`
  const entries = await $.fs.list(subDir).catch(() => [])
  const files = entries.filter(e => e.kind === 'file' && /^agent-.+\.jsonl$/.test(e.name))
  if (files.length === 0) return
  const ids = new Set(files.map(f => f.name.replace(/^agent-/, '').replace(/\.jsonl$/, '')))
  const known = await readAgents($)
  for (const file of files) {
    const id = file.name.replace(/^agent-/, '').replace(/\.jsonl$/, '')
    const path = `${subDir}/${file.name}`
    const existing = known.find(a => a.id === id)
    if (existing && isEnded(existing.status) && (existing.endedAt === undefined || t - existing.endedAt > 30_000)) continue
    let meta = sidecars.get(id)
    if (!meta) {
      const raw = await $.fs.read(`${subDir}/agent-${id}.meta.json`).catch(() => '')
      try {
        meta = raw ? (JSON.parse(raw) as Sidecar) : {}
      } catch {
        meta = {}
      }
      sidecars.set(id, meta)
    }
    const text = await $.fs.read(path).catch(() => '')
    if (!text) continue
    const ledger = parseLedger(text)
    ledgerLines.set(id, ledger.lines.slice(-200))
    ledgerPaths.set(id, path)
    const isDone = !ledger.isMidTool && t - file.mtimeMs > 3000 && ledger.lines.length > 0
    const parentId = meta.parentAgentId && ids.has(meta.parentAgentId) ? meta.parentAgentId : parent.id
    const base: Subagent = existing ?? {
      id,
      parentId,
      description: meta.description ?? '',
      type: meta.agentType ?? 'agent',
      source: 'ledger',
      status: 'running',
      startedAt: ledger.firstAt ?? file.mtimeMs,
      toolCalls: 0,
      usage: NO_USAGE,
      costUsd: 0,
    }
    const next: Subagent = {
      ...ledgerFields(base, ledger),
      parentId,
      status: isDone ? 'completed' : base.status === 'completed' ? 'completed' : 'running',
      endedAt: isDone ? (base.endedAt ?? ledger.lastAt ?? t) : base.endedAt,
    }
    await update($, agents, all => {
      const rest = all.map(normalise).filter(a => a.id !== id)
      return [...rest, next].slice(-200)
    })
    if (!existing) void noteEvent($, `A new subagent started under ${agentLabel(parent)}: ${agentLabel(next)}, task "${next.description}".`).catch(() => undefined)
    else if (!isEnded(existing.status) && isDone) void noteEvent($, `Subagent ${agentLabel(next)} (${next.description}) finished after ${elapsed((next.endedAt ?? t) - next.startedAt)}.`).catch(() => undefined)
  }
}

async function refreshTeammateLedgers($: EngineInterface, t: number) {
  if (t - ledgerAt < LEDGER_EVERY_MS) return
  ledgerAt = t
  const list = await readAgents($)
  const mates = list.filter(a => a.isTeammate && (isLive(a.status) || (a.endedAt !== undefined && t - a.endedAt < 30_000)))
  if (mates.length === 0) return
  const home = (await $.env.get('HOME').catch(() => undefined)) ?? ''
  const cwd = await $.session.cwd().catch(() => '')
  const sessionId = await $.session.id().catch(() => '')
  if (!home || !cwd || !sessionId) return
  const dir = `${home}/.claude/projects/${projectDirName(cwd)}`
  const team = `session-${sessionId.slice(0, 8)}`
  for (const a of mates) {
    let path = ledgerPaths.get(a.id)
    if (!path) {
      path = await findLedgerFile($, a, team, dir)
      if (!path) continue
      ledgerPaths.set(a.id, path)
    }
    const text = await $.fs.read(path).catch(() => '')
    if (!text) continue
    const ledger = parseLedger(text)
    ledgerLines.set(a.id, ledger.lines.slice(-200))
    await update($, agents, all => all.map(normalise).map(entry => (entry.id === a.id ? ledgerFields(entry, ledger) : entry)))
    await discoverChildren($, a, path, dir, t)
  }
}

let ticker: Timer | undefined

async function tick($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
  await refreshSessionFacts($, t)
  const known = await $.agent.list().catch(() => undefined)
  if (known) {
    const byId = new Map(known.map(a => [a.id, a]))
    await update($, agents, list =>
      list.map(normalise).map(a => {
        if (isEnded(a.status) || a.source === 'ledger') return a
        const live = byId.get(a.id)
        if (!live) {
          if (t - a.startedAt <= GONE_AFTER_MS) return a
          void noteEvent($, `Subagent ${agentLabel(a)} (${a.description}) vanished without finishing; it was probably killed.`).catch(() => undefined)
          return { ...a, status: 'killed' as const, endedAt: t }
        }
        if (live.status === a.status) return a
        const endedAt = isEnded(live.status) ? t : a.endedAt
        return { ...a, status: live.status, endedAt, name: live.name ?? a.name }
      }),
    )
  }
  await refreshTeammateLedgers($, t)
  await noteCost($)
  void refreshQuip($, t).catch(() => undefined)
}

function startTicker($: EngineInterface) {
  if (ticker) return
  ticker = $.clock.every(TICK_MS, () => void tick($).catch(() => undefined))
}

type TreeNode = { agent: Subagent; children: TreeNode[] }

function buildTree(list: readonly Subagent[]): TreeNode[] {
  const nodes = new Map(list.map(a => [a.id, { agent: a, children: [] as TreeNode[] }]))
  const roots: TreeNode[] = []
  const newestFirst = list
    .map((a, i) => ({ a, i }))
    .sort((x, y) => y.a.startedAt - x.a.startedAt || y.i - x.i)
    .map(({ a }) => a)
  for (const a of newestFirst) {
    const node = nodes.get(a.id)
    if (!node) continue
    const parent = a.parentId ? nodes.get(a.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

function agentLabel(a: Subagent): string {
  return clip(a.name ?? a.type, NAME_CHARS)
}

function agentCost(a: Subagent): string {
  return `≈${usd(a.costUsd)}`
}

function agentElapsed(a: Subagent, t: number): string {
  const end = a.endedAt ?? Math.max(t, a.startedAt)
  return elapsed(end - a.startedAt)
}

function detailLine(a: Subagent, t: number): string {
  const tools = a.toolCalls > 0 ? ` · ${a.toolCalls} tool${a.toolCalls === 1 ? '' : 's'}` : ''
  return `${shortModel(a.model)} · ${agentElapsed(a, t)} · ${STATUS_WORD[a.status]} · ${agentCost(a)}${tools}`
}

function doneLine(a: Subagent, t: number): string {
  return ` · ${a.description} · ${agentElapsed(a, t)} · ${agentCost(a)}`
}

function transcriptLines(rows: readonly SessionMessage[], width: number): string[] {
  const lines: string[] = []
  for (const row of rows) {
    if (row.text.trim()) {
      const mark = row.role === 'user' ? '▸ ' : '  '
      lines.push(`${mark}${clip(row.text, width - 2)}`)
    }
    for (const use of row.toolUses) {
      lines.push(`  » ${clip(describeTool(use.tool, use.input), width - 4)}`)
      if (use.text) lines.push(`    ${clip(use.text, width - 6)}`)
    }
  }
  return lines
}

const CLIPPY = [
  '   ╭──╮ ',
  '   │  │ ',
  '   │  │ ',
  '   @  @ ',
  '   │  │ ',
  '   ││ │╮',
  '   ││ ││',
  '   │╰─╯│',
  '   ╰───╯',
]
const CLIPPY_EYES = 3

function clippySays(info: RootInfo, held: Quip | null): string {
  if (held?.text) return held.text
  const activity = info.activity ?? ''
  if (!info.isWorking) return "It looks like you're writing a prompt. Would you like help with that?"
  if (activity.startsWith('thinking')) return 'It looks like Claude is thinking. Would you like me to hum while you wait?'
  if (/^(editing|reading|running|searching|fetching|spawning|using)\b/.test(activity)) {
    return `It looks like Claude is ${activity}. Would you like help with that?`
  }
  return 'It looks like Claude is answering. Would you like help reading it?'
}

type BubbleRow = { left: string; text: string; right: string }

function bubble(text: string, width: number, maxLines: number): BubbleRow[] {
  const inner = Math.max(8, width - 4)
  let lines = wrap(text, inner)
  if (lines.length > maxLines) {
    lines = lines.slice(0, Math.max(1, maxLines))
    const last = lines[lines.length - 1] ?? ''
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, inner - 1)).trimEnd()}…`
  }
  const w = Math.max(...lines.map(l => l.length))
  const tailAt = Math.min(lines.length - 1, Math.max(0, CLIPPY_EYES - 1))
  return [
    { left: ' ╭─', text: '─'.repeat(w), right: '─╮' },
    ...lines.map((l, i) => ({ left: i === tailAt ? '◀┤ ' : ' │ ', text: l.padEnd(w), right: ' │' })),
    { left: ' ╰─', text: '─'.repeat(w), right: '─╯' },
  ]
}

let topWindow = { content: 0, rows: 0 }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'monitor',
      description: 'Show the session monitor pane: the subagent tree, costs and Clippy',
    })
    startTicker($)
    return next(e)
  })

  on('command.run', { command: 'monitor' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE, columns: COLUMNS })
    startTicker($)
    return { text: 'Monitor pane opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const id = spawned.teammateId ?? spawned.agentId
    if (!id) return spawned
    const startedAt = await $.clock.now()
    const entry: Subagent = {
      id,
      parentId: e.parentAgentId,
      description: e.description,
      type: e.subagentType,
      name: e.name,
      model: spawned.model ?? e.model,
      isTeammate: e.isTeammate === true || spawned.teammateId !== undefined,
      status: 'running',
      startedAt,
      toolCalls: 0,
      usage: NO_USAGE,
      costUsd: 0,
    }
    await update($, agents, list => [...list.filter(a => a.id !== entry.id), entry].slice(-200))
    await setActivity($, e.parentAgentId, `spawning ${e.description}`)
    startTicker($)
    await openPane($)
    void noteEvent($, `A new subagent started: ${agentLabel(entry)} on ${shortModel(entry.model)}, task "${entry.description}".`).catch(() => undefined)
    return spawned
  })

  on('tool.call', async ($, e, next) => {
    const args = e as unknown as Record<string, unknown>
    const activity = describeTool(String(e.tool), args)
    const agentId = e.agentId
    if (agentId) {
      await update($, agents, list =>
        list.map(a => (a.id === agentId ? { ...a, toolCalls: a.toolCalls + 1 } : a)),
      )
    }
    await setActivity($, agentId, activity)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, root, r => ({ ...r, isWorking: true, activity: 'thinking' }))
    if (e.text.trim()) {
      lastPrompt = clip(e.text, 200)
      void noteEvent($, `The developer just sent a prompt: "${lastPrompt}"`).catch(() => undefined)
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    let thinking = ''
    let text = ''
    let shownAt = 0
    let block = -1
    let isFlushed = false
    const flush = async () => {
      isFlushed = true
      if (text.trim()) await setActivity($, e.agentId, text.slice(-ACTIVITY_CHARS))
      else if (thinking.trim() && shownAt === 0) await setActivity($, e.agentId, `thinking: ${thinking}`)
    }
    for await (const chunk of stream) {
      if (chunk.kind === 'thinking') {
        if (chunk.index !== block) {
          block = chunk.index
          thinking = ''
          shownAt = 0
        }
        thinking += chunk.text
        if (thinking.length >= 40 && thinking.length - shownAt >= 160) {
          shownAt = thinking.length
          await setActivity($, e.agentId, `thinking: ${thinking}`)
        }
      } else if (chunk.kind === 'text') {
        text += chunk.text
        if (text.length - shownAt >= 160) {
          shownAt = text.length
          await setActivity($, e.agentId, `…${text.slice(-ACTIVITY_CHARS)}`)
        }
      } else if (chunk.kind === 'stop') {
        await flush()
        if (chunk.usage) {
          await addUsage(
            $,
            e.agentId,
            {
              input: chunk.usage.input_tokens,
              output: chunk.usage.output_tokens,
              cacheRead: chunk.usage.cache_read_input_tokens,
              cacheWrite: chunk.usage.cache_creation_input_tokens,
            },
            chunk.usage.model,
          )
        }
      }
      yield chunk
    }
    if (!isFlushed) await flush()
    return await stream.result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    const endedAt = await $.clock.now()
    const answer = e.answer ? clip(e.answer, ACTIVITY_CHARS) : undefined
    if (agentId === undefined) {
      await update($, root, r => ({ ...r, isWorking: false, activity: answer ?? r.activity }))
      return next(e)
    }
    const status: SubagentStatus =
      e.reason === 'answer' ? 'completed' : e.reason === 'aborted' ? 'killed' : 'failed'
    const ended = (await readAgents($)).find(a => a.id === agentId && isLive(a.status))
    await update($, agents, list =>
      list.map(a =>
        a.id === agentId && isLive(a.status)
          ? { ...a, status, endedAt, activity: answer ?? a.activity }
          : a,
      ),
    )
    if (ended) {
      const how = status === 'completed' ? 'finished' : status === 'killed' ? 'was killed' : 'failed'
      void noteEvent($, `Subagent ${agentLabel(ended)} (${ended.description}) ${how} after ${elapsed(endedAt - ended.startedAt)}${answer ? `, saying: ${clip(answer, 120)}` : ''}.`).catch(() => undefined)
    }
    return next(e)
  })

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const inClippy = e.pointer !== undefined && topWindow.rows > 0 && e.pointer.row >= topWindow.rows
    if (inClippy) return {}
    const max = Math.max(0, topWindow.content - Math.max(1, topWindow.rows - 2))
    await update($, scroll, offset => Math.min(max, Math.max(0, (offset ?? 0) + e.by)))
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    try {
      return await drawPane($, e)
    } catch (error) {
      return (
        <Box flexDirection="column">
          <Text color="error">monitor: {error instanceof Error ? error.message : String(error)}</Text>
        </Box>
      )
    }
  })
}

type PaneRender = Parameters<Events['ui.render']>[1] & { component: 'Pane'; surface: 'terminal' | 'desktop' | 'vscode' | 'mobile' }

async function drawPane($: EngineInterface, e: PaneRender): Promise<RenderElement> {
  const { Box, Text, Button } = $.ui.resolve(e)
  const list = await readAgents($)
  const info: RootInfo = await read($, root)
  const t = await read($, now)
  const viewing = await read($, view)
  const offset = await read($, scroll)
  const held: Quip | null = await read($, quip)
  const width = Math.max(20, e.props.bodyColumns)
  const bodyRows = Math.max(4, e.props.scroll.bodyRows)
  if (sessionFacts.at === 0 || t - sessionFacts.at >= TICK_MS) await refreshSessionFacts($, t)
  const rootCost = sessionFacts.costUsd ?? info.costUsd
  const total = rootCost + list.reduce((sum, a) => sum + a.costUsd, 0)
  const rootStart = sessionFacts.startedAt ?? info.startedAt ?? t

  const blank = () => <Text> </Text>
  const line = (key: string | undefined, text: string, dim: boolean) => (
    <Box key={key}>
      <Text dimColor={dim} wrap="truncate-end">
        {text}
      </Text>
    </Box>
  )

  const rows: RenderElement[] = [
    <Box key="summary">
      <Text bold wrap="truncate-end">
        {summary(list, total)}
      </Text>
    </Box>,
    blank(),
  ]

  const clippyRows = CLIPPY.length + 1
  const hasClippy = bodyRows >= clippyRows + MIN_TREE_ROWS
  const topRows = hasClippy ? bodyRows - clippyRows : bodyRows

  const focused = viewing ? list.find(a => a.id === viewing) : undefined
  if (focused) {
    let lines: string[] | undefined
    if (!focused.isTeammate) {
      const got = await $.session.messages({ agentId: focused.id }).catch(() => undefined)
      if (Array.isArray(got)) lines = transcriptLines(got, width)
    }
    if (!lines || lines.length === 0) lines = (ledgerLines.get(focused.id) ?? []).map(l => clip(l, width))
    rows.push(
      <Box>
        <Button key="back" plain onPress={() => void showAgent($, null)}>
          ‹ all agents
        </Button>
      </Box>,
      blank(),
      <Box key={`node-${focused.id}`} flexDirection="row">
        <Text color={STATUS_COLOR[focused.status]}>{GLYPH[focused.status]} </Text>
        <Text bold>{agentLabel(focused)}</Text>
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate-end">
            {' · '}
            {focused.description}
          </Text>
        </Box>
      </Box>,
      line(`detail-${focused.id}`, detailLine(focused, t), true),
      line(`usage-${focused.id}`, `${agentCost(focused)} · ${tokenLine(focused.usage)}${focused.isTeammate ? ' · teammate, read from its transcript' : ''}`, true),
      blank(),
    )
    if (lines.length === 0) rows.push(line('transcript', 'No transcript yet.', true))
    lines.forEach((text, i) => rows.push(line(i === 0 ? 'transcript' : undefined, text, text.startsWith('    '))))
  } else {
    rows.push(
      <Box key="node-main" flexDirection="row">
        <Text color={info.isWorking ? 'success' : 'subtle'}>{info.isWorking ? '● ' : '○ '}</Text>
        <Text color="claude" bold>
          main session
        </Text>
      </Box>,
      line('detail-main', `${shortModel(sessionFacts.model)} · ${elapsed(Math.max(0, t - rootStart))} · ${info.isWorking ? 'running' : 'idle'} · ${usd(rootCost)}`, true),
      line('usage-main', tokenLine(info.usage ?? NO_USAGE), true),
      line('activity-main', info.activity ?? '', false),
    )
    const walk = (nodes: TreeNode[], prefix: string) => {
      nodes.forEach((node, i) => {
        const a = node.agent
        const last = i === nodes.length - 1
        const branch = `${prefix}${last ? '└─ ' : '├─ '}`
        const cont = `${prefix}${last ? '   ' : '│  '}`
        const ended = isEnded(a.status)
        rows.push(
          <Box key={`node-${a.id}`} flexDirection="row">
            <Box key={`indent-${a.id}`}>
              <Text dimColor>{branch}</Text>
            </Box>
            <Text color={ended ? undefined : STATUS_COLOR[a.status]} dimColor={ended}>
              {GLYPH[a.status]}{' '}
            </Text>
            <Button key={`press-${a.id}`} plain dimColor={ended} onPress={() => void showAgent($, a.id)}>
              {agentLabel(a)}
            </Button>
            <Box flexGrow={1} flexShrink={1}>
              <Text dimColor={ended} wrap="truncate-end">
                {ended ? doneLine(a, t) : ` › · ${a.description}`}
              </Text>
            </Box>
          </Box>,
        )
        if (!ended) {
          rows.push(line(`detail-${a.id}`, `${cont}${detailLine(a, t)}`, true))
          rows.push(line(`activity-${a.id}`, `${cont}${a.activity ?? ''}`, false))
        }
        walk(node.children, cont)
      })
    }
    walk(buildTree(list), '')
  }

  const maxOffset = Math.max(0, rows.length - Math.max(1, topRows - 2))
  const at = Math.min(maxOffset, Math.max(0, offset))
  const aboveHint = at > 0
  let avail = topRows - (aboveHint ? 1 : 0)
  let below = rows.length - at - avail
  if (below > 0) {
    avail -= 1
    below = rows.length - at - avail
  }
  topWindow = { content: rows.length, rows: topRows }
  const visible: RenderElement[] = [
    ...(aboveHint ? [line('more-above', `▲ ${at} more`, true)] : []),
    ...rows.slice(at, at + Math.max(0, avail)),
    ...(below > 0 ? [line('more-below', `▼ ${below} more`, true)] : []),
  ]

  const says = bubble(clippySays(info, held), width - (CLIPPY[0]?.length ?? 8) - 5, clippyRows - 3)
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" height={topRows} overflow="hidden">
        {visible}
      </Box>
      {hasClippy && (
        <Box key="clippy" flexDirection="column" height={clippyRows} overflow="hidden">
          <Text dimColor wrap="truncate-end">
            {'─'.repeat(Math.max(1, width - 1))}
          </Text>
          <Box flexDirection="row">
            <Box flexDirection="column">
              {CLIPPY.map((art, i) =>
                i === CLIPPY_EYES ? (
                  <Box flexDirection="row">
                    <Text color="warning">{art.slice(0, 3)}</Text>
                    <Text bold>{art.slice(3, 4)}</Text>
                    <Text color="warning">{art.slice(4, 6)}</Text>
                    <Text bold>{art.slice(6, 7)}</Text>
                    <Text color="warning">{art.slice(7)}</Text>
                  </Box>
                ) : (
                  <Text color="warning">{art}</Text>
                ),
              )}
            </Box>
            <Box flexDirection="column">
              {says.map((row, i) => (
                <Box flexDirection="row">
                  <Text dimColor>{row.left}</Text>
                  <Text dimColor={i === 0 || i === says.length - 1} wrap="truncate-end">
                    {row.text}
                  </Text>
                  <Text dimColor>{row.right}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
