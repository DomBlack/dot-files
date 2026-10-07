export type SubagentStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'idle'
  | 'completed'
  | 'failed'
  | 'killed'

export type Usage = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type Subagent = {
  id: string
  parentId?: string
  description: string
  type: string
  name?: string
  model?: string
  isTeammate?: boolean
  source?: 'ledger'
  status: SubagentStatus
  startedAt: number
  endedAt?: number
  toolCalls: number
  activity?: string
  usage: Usage
  costUsd: number
}

export type Quip = {
  text: string
  at: number
  key: string
}

export type RootInfo = {
  model?: string
  startedAt?: number
  costUsd: number
  usage?: Usage
  activity?: string
  isWorking: boolean
}

declare module 'claude-code' {
  interface PluginState {
    monitor: {
      agents: Subagent[]
      root: RootInfo
      now: number
      view: string | null
      scroll: number
      quip: Quip | null
      costMark: number
    }
  }
}
