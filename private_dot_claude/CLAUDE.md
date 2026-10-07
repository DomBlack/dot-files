# Interacting with Git

Unless explicitly asked otherwise, use git-stack for branches, commits and PRs. Stacks are easier to review because each PR is smaller and more logically focused.

git-stack is installed as `git-stack` and exposed as `git stack <command>`. It also runs an MCP server (`git-stack`) whose tools should be available to you. **Prefer the MCP tools over the CLI** for anything that touches a stack; fall back to the CLI only when the server is not connected. Plain `git` is fine for reading (`git status`, `git diff`, `git log`) and for staging files.

### MCP tools

| Task | Tool |
|---|---|
| See every stack, PR state, what needs a restack | `stack_view` (read-only; run it before `stack_submit`) |
| New branch on top of the current one, committing staged changes | `stack_create` (you write `message`) |
| Amend the current branch's commit (or add one with `commit: true`) and restack everything above | `stack_modify` |
| Rebase the stack after edits lower down | `stack_restack` |
| Move around | `stack_navigate` (`up` / `down` / `top` / `bottom`, or a `branch`) |
| Push and create or update PRs | `stack_submit` (you write `pull_requests` as `{branch: {title, body}}`; ready for review unless `draft: true`) |
| Fetch, update trunk, restack, prune merged branches | `stack_sync` |
| Merge the stack's PRs up to a branch into trunk, all or nothing, then sync | `stack_merge` (`branch`, `method` = `merge`/`squash`/`rebase`, `no_sync`); plain `gh pr merge` refuses stacked PRs |

On an error with `code: "conflict"`, resolve the listed files, `git add` them, then call the same tool again with `continue: true` (or `abort: true` to give up). On `not_at_top`, call `stack_navigate {direction: "top"}` first; gh stack can only add branches at the top. On `interaction_required`, pass the text it needs (`message`, `pull_requests`) instead of letting it open an editor.

### CLI equivalents

- `git stack create [name] -m "subject" -m "body paragraph"` - new branch stacked on the current one from the staged changes. Repeated `-m` flags become separate paragraphs, so subject and body can be passed separately.
- `git stack modify` / `git stack modify -c -m "message"` - amend the current commit (or add a new one with `-c`) and restack descendants
- `git stack restack` - rebase each branch of the current stack onto its parent
- `git stack up` / `git stack down` / `git stack top` / `git stack bottom` / `git stack checkout <branch>` - navigate
- `git stack log` (also bare `git stack`) - show every stack as a tree with PR state
- `git stack submit --no-edit` - push the whole stack and create or update PRs (ready for review by default; `--draft` for drafts; `--dry-run` to preview)
- `git stack sync` - fetch, update trunk, restack, push, prune merged branches
- `git stack merge [branch]` - merge the stack's PRs up to and including a branch into trunk in one go, then sync (`--squash` `--rebase` `--merge` `--no-sync`)

Aliases: `git c`, `git m`, `git rs`, `git u`, `git d`, `git t`, `git b`, `git co`, `git ss`.

### Rules

- Never run `git rebase`, `git commit --amend` or `git push --force` by hand on a stacked branch. The branches above would be left behind. Use `stack_modify` / `stack_restack`.
- New work goes on a new branch on top (`stack_create`). To change something lower down, `stack_navigate` there, edit, then `stack_modify`; it restacks the rest.
- `stack_submit` always submits the whole stack, so run `stack_view` first to know which branches get new PRs and need titles and bodies.

### Typical Workflow

1. Stage the files, then `stack_create` with a commit message
2. Further changes to the same branch: stage, then `stack_modify`
3. `stack_view`, then `stack_submit` with a title and body per new PR
4. For stacked changes: `stack_create` again on top, then `stack_submit` again

# Commit messages, PR titles and PR descriptions

Every commit message, PR title and PR description is written in my voice: run `/dom-voice` before drafting any of them. Do not skip it for "small" commits.

Layout is always **why, then how**:

- **Subject / title**: one short imperative line saying what changes.
- **Why** first: the problem, the bug, or the reason this is worth doing. A reader should understand the motivation before they see a single implementation detail.
- **How** second: the shape of the change, kept to what a reviewer needs to follow the diff. Don't restate the diff line by line.

Never mention how the tests are written (frameworks, fixtures, mocking approach, which test files changed) unless it is critical to the story, for example when the whole PR is about the test infrastructure or a test caught the bug being fixed. "Tests added" style filler is noise; leave it out.

Do NOT comment on the stack position or what tooling was pushed to push the stack on the PR description

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
