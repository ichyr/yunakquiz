# Token usage analysis: agent guardrails work (PRs 42–44)

Retrospective on the two Claude Code sessions that implemented the agent guardrails (issues #34–#41, merged as PRs 42, 43 and 44) and used up the plan's usage limit, although the files they produced are small.

## How the cost adds up

Every model call re-reads the agent's whole context, so cost is roughly **number of calls × context size**. Output (the code itself) is a small share.

Session `12ed446e` (implementation, coordinator plus 20 subagents) made 359 model calls:

| Where                                               | Model calls | Tokens read (mostly cached context) |
| --------------------------------------------------- | ----------- | ----------------------------------- |
| Coordinator (main thread)                           | 69          | 6.9M                                |
| 7 implementer subagents                             | ~240        | ~25M                                |
| 15 code-review subagents                            | ~60         | ~3M                                 |
| 27 nested `claude -p` sessions started by subagents | 152         | 5.2M                                |
| Follow-up session `94d049a0` (merge, cleanup)       | 40          | 3.9M                                |

Total output across those calls was about 290k tokens. Everything ran on Opus.

The most expensive subagents:

| Issue                    | Model calls | Peak context | Tokens read |
| ------------------------ | ----------- | ------------ | ----------- |
| #35 Bash sandbox         | 61          | 208k         | ~9.9M       |
| #39 Lock guardrail files | 44          | 225k         | ~7.5M       |
| #41 git-guard hook       | 32          | 201k         | ~5.1M       |
| #38 Claude PR review     | 40          | 113k         | ~3.0M       |

## Findings, most expensive first

### 1. Guardrails were verified by launching real Claude sessions

To check the hooks and the sandbox for #35, #39 and #41, subagents built throwaway copies of the repo and ran `timeout 400 claude -p …` against them, 27 times. That cost 5.2M tokens directly. It also kept the #35 and #39 subagents running for 61 and 44 calls with context above 200k, about 17M between them.

**Fix:** verify guardrails with `pnpm test:guardrails`, which feeds hook JSON on stdin. The live check inside Claude Code is one manual step in the PR's Verification section, done by a person. Record this as a "How to verify" section in [ADR 0007](adr/0007-agent-guardrails.md), which guardrail agents already read.

### 2. Every agent runs on Opus, including reviewers

The user settings set `"model": "opus"`, and every subagent inherits it. Opus uses up subscription limits faster than Sonnet.

**Fix:** set `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` in the `env` block of `~/.claude/settings.json`, or pass `model: "sonnet"` when delegating. Keep Opus for the coordinator and genuinely hard tickets, such as the sandbox one.

### 3. Parallel work multiplies cost

Each subagent starts with about 35k tokens of context before doing any work, and then re-reads CLAUDE.md, GLOSSARY.md, the ADRs and its issue. Every implementer also ran the `code-review` skill, which starts two reviewer agents (one implementer ran it twice): 15 extra agents, including reviews of a PR template and an ADR.

**Fix:** run `code-review` once on the top of a stacked branch, not once per ticket, and skip it for docs-only tickets. Run small tickets one after another. Parallel runs save wall-clock time, not tokens.

### 4. Delegation prompts loaded skills and docs the ticket didn't need

The prompts told implementers to load `update-config`, about 8k tokens. It was loaded by 4 agents and the follow-up session, only to look up the hooks schema that `.claude/settings.json` already shows. Guardrail tickets were also told to read GLOSSARY.md and the ADRs, which don't apply to them.

**Fix:** name only the files and skills each ticket needs.

### 5. Every session starts with 35–46k tokens of context

The starting context includes the skill listing (25+ AWS skills, Vercel, the docs connector) and about 40 deferred chrome-devtools tools, none of which this repo uses. Across 359 calls this starting context alone is roughly 13M of the 35M tokens read.

**Fix:** check `/context`, then turn off unused plugins and connectors for this project, for example `"chrome-devtools-mcp@claude-plugins-official": false` under `enabledPlugins`. `.claude/settings.json` is locked against agent edits ([ADR 0007](adr/0007-agent-guardrails.md)), so a person makes this change.

### 6. The coordinator ran too long before handing off

The coordinator grew to 142k context and kept working after the usage-limit warning before writing a handoff. Every subagent's report and completion notice landed in its context.

**Fix:** hand off or `/clear` at around 80–100k context, or after each batch of tickets merges.

## Summary of actions

| Action                                                                  | Owner                 | Expected effect                                    |
| ----------------------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| "How to verify" section in ADR 0007: unit tests, not nested `claude -p` | Repo                  | Removes ~5M direct, shortens the longest subagents |
| `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`                                     | User settings         | Lower limit usage per subagent call                |
| One `code-review` per stack; none for docs-only tickets                 | Workflow              | ~3M fewer per batch of 7 tickets                   |
| Delegation prompts name only the files and skills each ticket needs     | Workflow              | ~8k tokens per agent that skips `update-config`    |
| Disable unused plugins and connectors for this project                  | User/project settings | Smaller starting context on every call             |
| Hand off at 80–100k context                                             | Workflow              | Cheaper coordinator calls                          |
