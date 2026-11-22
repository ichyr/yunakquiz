# Contributing

Post-MVP work is tracked as GitHub Issues labelled `roadmap`; content fixes are labelled `content`.

## Delegating work to agents

Cost is roughly model calls times context size, so keep both small. Background: [the token usage analysis](18112026-complete-token-usage-analisys.md).

- **Models:** subagents run on Sonnet (`CLAUDE_CODE_SUBAGENT_MODEL=sonnet` in user settings, or `model: "sonnet"` when delegating). Use Opus for the coordinator and for genuinely hard tickets.
- **Ticket prompt:** name the issue, the files to touch, and only the skills and docs the ticket needs. Load no skill by default. Guardrail tickets get [ADR 0007](adr/0007-agent-guardrails.md), not GLOSSARY.md or the other ADRs. Don't load `update-config`; `.claude/settings.json` already shows the schema.
- **Order:** run small tickets one after another. Parallel runs save wall-clock time, not tokens, because each subagent starts with about 35k tokens of context.
- **Review:** implementers don't run `code-review`. Run it once on the top of a stacked branch. Skip it for docs-only tickets.
- **Reports:** ask a subagent for a report of 10 lines or fewer: PR link, verification result, open questions, and a **Decisions made** section (see below).
- **No resume, spawn fresh:** never resume a finished or stopped subagent with `SendMessage`. A resumed implementer carries 150–200k tokens of context and re-reads it every turn; a fresh subagent starts at about 35k. For a follow-up fix or a restart, spawn a new subagent and name the branch, the current commit, and the exact change. To stop a subagent that is going wrong, stop it and respawn it with a tighter prompt; don't steer it with a message.
- **Decisions made:** every subagent report ends with a **Decisions made** section, whether the run succeeded, failed, or was stopped. It is the only thing a fresh subagent inherits, so it must stand alone. List, one line each: what was chosen and why, what was tried and rejected, what is unverified, and where the work stopped (branch, last commit, uncommitted changes). On a failed or stopped run, also say what blocked it and what you would try next. Put this requirement in every ticket prompt.
- **Handoff:** the coordinator hands off or runs `/clear` at 80–100k context, or after each batch of tickets merges.
- **Starting context:** check `/context` now and then. A person turns off plugins and connectors this repo doesn't use, since `.claude/settings.json` is locked against agents.
