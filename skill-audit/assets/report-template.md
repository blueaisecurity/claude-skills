# Skill audit: {{SKILL_NAME}}

| | |
|---|---|
| **Verdict** | {{✅ No red flags found / ⚠️ Install with changes / ⛔ Don't install}} |
| **In one line** | {{Why}} |
| **Audited** | {{path or repo URL}} @ {{commit hash / SHA-256 of each file, listed under Scope}} |
| **Date** | {{YYYY-MM-DD}} |
| **Method** | Grep sweep + manual review · {{standard / deep}} |

## What it claims vs what it does

- **Claims (description):** {{…}}
- **Actually does:** {{plain-language summary of what SKILL.md tells Claude to do and what the scripts do}}
- **Match?** {{Yes / partly / no, with why}}

## What it can do without asking you

| Pre-approved (`allowed-tools`) | Risk | In plain words |
|---|---|---|
| `{{entry}}` | {{CRITICAL/HIGH/MEDIUM/LOW/INFO}} | {{what this lets it do}} |

Can Claude start it on its own? **{{Yes / No (only via /command)}}**

Commands that run when the skill loads (checklist section 1a): {{list with what each runs, or "none"}}

Hooks in the frontmatter, and plugin parts that run on their own (hooks, MCP servers): {{list with what each runs, or "none"}}

Instruction files inside the target (`CLAUDE.md`, `AGENTS.md`, `.claude/`): {{list, or "none"}}

## What it installs and runs

| What | Type | When | Asks you first? | Version | From |
|---|---|---|---|---|---|
| `{{name}}` | {{program / package / library / its own script / shell command / browser script}} | {{step, and on what condition}} | {{No: pre-approved / No: runs when the skill loads / No: inside a script you approved / Yes: permission prompt / Yes: the skill asks, then a permission prompt}} | {{pinned / minimum / newest / n/a}} | {{winget, PyPI, npm, a URL, bundled, already on your computer}} |

In short: it installs {{N}} things, {{all after asking / X without asking}}, and runs {{M}} commands or scripts, {{all after asking / X without asking}}.

## Where it connects

| Address | What for | When | Asks you first? |
|---|---|---|---|
| `{{domain}}` | {{what it gets or sends}} | {{step or condition}} | {{Yes / No: pre-approved / No: inside a script you approved}} |

## Reputation and provenance

Looked up on {{YYYY-MM-DD}}, or "not checked" (local folder, or the user declined the network lookup).

| Signal | Found | Effect on the verdict |
|---|---|---|
| Owner | {{name, account created YYYY-MM}} | {{none / stricter because …}} |
| Repo | {{created YYYY-MM, last push YYYY-MM-DD, N stars, N forks}} | {{none / stricter because …}} |
| Name | {{original / copies "…" from another owner}} | {{none / ⛔}} |
| Release | {{audited commit is tag … / not a tagged release}} | {{none / note}} |
| Packages it installs | {{owner and repo match / differ}} | {{none / stricter because …}} |

Rule: these signals can make the verdict stricter, never better.

## What it reads and writes

- **Reads:** {{files, folders, environment variables}}
- **Writes:** {{where}}

## Findings

### Must fix / reasons not to install
| # | Where | What | Assessment |
|---|---|---|---|
| 1 | `{{file:line}}` | {{finding}} | {{Suspicious / Malicious}}: {{why}} |

### Expected for its purpose (false positives)
| Where | Flag | Why it's fine |
|---|---|---|
| `{{file:line}}` | {{rule}} | {{one line}} |

## Hardening

```yaml
# before
{{original frontmatter lines}}
# after
{{hardened frontmatter lines}}
```

Other changes: {{wording to remove, scripts to change, or "none"}}

## Scope and limits

- Files read in full: {{list}}
- Files checked by the pattern sweep only: {{list or "none"}}
- Symbolic links: {{list with targets, or "none"}}
- Not covered: dependencies weren't audited recursively; binaries and archives can't be reviewed by reading;
  a static review can't prove a skill is safe. **Re-audit after every update.**
