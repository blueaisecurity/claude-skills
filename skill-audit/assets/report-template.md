# Skill audit: {{SKILL_NAME}}

| | |
|---|---|
| **Verdict** | {{✅ No red flags found / ⚠️ Install with changes / ⛔ Don't install}} |
| **In one line** | {{Why}} |
| **Audited** | {{path or repo URL}} @ {{commit hash / zip name + date}} |
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

## Data flows

- **Reads:** {{files, folders, environment variables}}
- **Runs:** {{programs and commands}}
- **Sends data to / downloads from:** {{domains, or "nothing"}}
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
