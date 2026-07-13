# MCP Tool Routing

- **context7**: when writing or reviewing code that calls an external library or
  framework API, resolve the library with context7 and check the current docs
  before coding against it — do not rely on memorised API signatures. Skip it
  for code that only uses the language's standard library or the repo's own code.
- **codebase-memory-mcp**: for structural code questions — who calls X,
  implementations of Y, trace a path from A to B, blast radius of a change,
  architecture overview — query its graph tools (`search_graph`, `trace_path`,
  `query_graph`, `get_architecture`) before reaching for grep. Use grep for
  plain text/string hunts or when the graph lacks the answer.
