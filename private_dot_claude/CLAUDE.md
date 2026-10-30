# Interacting with Git

Unless explicitly asked otherwise, use git-stack for branches, commits and PRs. Stacks are easier to review because each PR is smaller and more logically focused.

git-stack is installed as `git-stack` and exposed as `git stack <command>`. It also runs an MCP server (`git-stack`) whose tools should be available to you. **Prefer the MCP tools over the CLI** for anything that touches a stack; fall back to the CLI only when the server is not connected. Plain `git` is fine for reading (`git status`, `git diff`, `git log`) and for staging files.

The tool-by-tool reference (MCP tool names and arguments, error codes, CLI equivalents and aliases) lives in the `git-stack` skill and in the git-stack server's own instructions. Invoke the skill rather than working from memory. Plain `gh pr merge` refuses stacked PRs; use `stack_merge`.

### Rules

- Never run `git rebase`, `git commit --amend` or `git push --force` by hand on a stacked branch. The branches above would be left behind. Use `stack_modify` / `stack_restack`.
- New work goes on a new branch on top (`stack_create`). To change something lower down, `stack_navigate` there, edit, then `stack_modify`; it restacks the rest.
- `stack_submit` always submits the whole stack, so run `stack_view` first to know which branches get new PRs and need titles and bodies.

# Commit messages, PR titles and PR descriptions

Before writing or rewriting any commit message, PR title or PR description, use the `git-writing` skill. It covers the shape (why, then how) and pulls in `dom-voice` for the tone. Do not skip it for "small" commits.

# MCP Tool Routing

- **git-stack**: for anything that creates, amends, rebases, navigates or submits a stacked branch, use its `stack_*` tools (see above) rather than shelling out to `git stack` or raw `git`.
- **context7**: when writing or reviewing code that calls an external library or
  framework API, resolve the library with context7 and check the current docs
  before coding against it; do not rely on memorised API signatures. Skip it
  for code that only uses the language's standard library or this repo's own code.
- **codebase-memory-mcp**: for structural code questions (who calls X,
  implementations of Y, trace a path from A to B, blast radius of a change,
  architecture overview) query its graph tools (`search_graph`, `trace_path`,
  `query_graph`, `get_architecture`) before reaching for grep. Use grep for
  plain text/string hunts or when the graph lacks the answer.

# Agent teams: shut teammates down when you are done with them

Teammates run in process (`teammateMode` is `in-process`), so there are no tmux panes to tidy; the
`/monitor` pane shows every teammate and subagent with its status, time and cost. A finished teammate
left alone still sits idle for the rest of the session, holding its context and listening for
messages. So:

- When a teammate reports its task done and you have no further work for it, stop it straight away
  (TaskStop by name, or a shutdown request).
- If you may still send it follow-up work (a review fix round, a re-check), keep it until that is
  settled, then stop it.
- Before you finish a session, stop every teammate you spawned.

A teammate you left waiting a long time may have been reaped: spawn a fresh one instead of retrying
the message.
