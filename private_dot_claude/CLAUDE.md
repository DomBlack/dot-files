# Interacting with Git

Unless explicitly asked otherwise, use `gt` CLI for interacting with PRs and creating stacks. Stacks are easier to review because each PR is smaller and more logically focused.

Use these commands instead of `git` commands.

### Creating and Managing Branches
- `gt create` - Create a new branch stacked on the current branch
- `gt create -m "branch name"` - Create a branch with a specific name
- `gt down` / `gt up` - Navigate down/up the stack
- `gt branch` - Show the current stack

### Committing Changes
- `gt commit -m "message"` or `gt c -m "message"` - Commit changes (works like git commit)
- `gt amend` - Amend the current commit

### Submitting PRs
- `gt submit` - Submit current branch as a PR (interactive)
- `gt submit --no-interactive` - Submit without prompts
- `gt submit --stack` - Submit entire stack of branches
- `gt submit --stack --no-interactive` - Submit entire stack without prompts

### Syncing and Rebasing
- `gt sync` - Sync with remote and rebase stack
- `gt restack` - Rebase children branches after amending

### Other Useful Commands
- `gt log` - Show the stack in a visual format
- `gt bottom` / `gt top` - Jump to bottom/top of the stack
- `gt fold` - Fold current branch into parent (squash merge)

### Typical Workflow
1. `gt create -m "feature-name"` - Create a new branch
2. Make changes and `gt commit -m "commit message"`
3. `gt submit --no-interactive` - Create PR
4. For stacked changes: `gt create -m "next-feature"` on top
5. `gt submit --stack --no-interactive` - Submit all PRs

# MCP Tool Routing

- **context7**: when writing or reviewing code that calls an external library or
  framework API, resolve the library with context7 and check the current docs
  before coding against it — do not rely on memorised API signatures. Skip it
  for code that only uses the language's standard library or this repo's own code.
- **codebase-memory-mcp**: for structural code questions — who calls X,
  implementations of Y, trace a path from A to B, blast radius of a change,
  architecture overview — query its graph tools (`search_graph`, `trace_path`,
  `query_graph`, `get_architecture`) before reaching for grep. Use grep for
  plain text/string hunts or when the graph lacks the answer.

