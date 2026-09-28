# Skill audit: {{SKILL_NAME}}

| | |
|---|---|
| **Verdict** | {{✅ No problems found / ⚠️ Install with changes / ⛔ Don't install}} (between two verdicts, always the stricter one; name the fact that decided it) |
| **In one line** | {{Why}} |
| **Audited** | {{path or repo URL}} @ {{commit hash / SHA-256 of each file, listed under Scope}} |
| **Date** | {{YYYY-MM-DD}} |
| **Method** | Grep sweep + manual review · {{standard / deep}} |
| **Context** | {{what the user said about origin, maker and audience, or "none given"}} |

## What it claims vs what it does

- **Claims (description):** {{…}}
- **Context says it is for:** {{the purpose and audience the user gave, or "none given"}}
- **Actually does:** {{plain-language summary of what SKILL.md tells Claude to do and what the scripts do}}
- **Match?** {{Yes / partly / no, with why, against both the description and the context}}
- **Context checked against the files:** {{matches / contradicts: which file, owner, domain or path}}
- **What the context changed:** {{findings relabelled as expected, findings rated more serious, or "nothing"}}

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
| `{{name}}` | {{program / package / library / its own script / shell command / browser script}} | {{step, and on what condition}} | {{No: pre-approved / No: runs when the skill loads / No: plugin hook / No: inside a script you approved / Yes: permission prompt / Yes: the skill asks, then a permission prompt}} | {{pinned / minimum / newest / n/a}} | {{winget, PyPI, npm, a URL, bundled, already on your computer}} |

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

- **Reads:** {{files, folders, environment variables, Claude's memory}}
- **Writes:** {{where}}

## Findings

### Must fix / reasons not to install
| # | Where | What | Risk | Assessment |
|---|---|---|---|---|
| 1 | `{{file:line}}` | {{finding}} | {{CRITICAL/HIGH/MEDIUM/LOW}}{{, "for this team; X otherwise" when the context raised it}} | {{Suspicious / Malicious}}: {{why}} |

### Notes (low findings and defects; they don't change the verdict)
| Where | What | Kind |
|---|---|---|
| `{{file:line}}` | {{finding}} | {{Low / Defect}} |

### Worth considering (optional, for ✅)
{{Easy improvements that aren't required, such as a version pin or `disable-model-invocation`. Or delete this section.}}

### Decisions for you
{{Trade-offs of the skill's core job that are yours to decide, for example a public preview link, which account to
use, whose data goes where, and whether consent is needed. With context, say what the audience means for them. Or
delete this section.}}

### Expected for its purpose (false positives)
| Where | Flag | Why it's fine |
|---|---|---|
| `{{file:line}}` | {{rule}} | {{one line}} |

## Hardening
{{For ⛔, call this section "What would change the verdict" and say what would have to be true instead.}}

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
- Blind spots read by hand (`.git/`, ignored files, `node_modules/` and the like): {{list or "none"}}
- **What a review can't catch:** a command or path split into pieces and rebuilt at runtime can slip past both the
  patterns and a read. The only full answer is to run the skill in a sandbox and watch what it does. For a skill you
  don't trust, do that, and after its first run compare the file hashes above with the skill's files, since a
  self-extracting skill rewrites itself.
- Not covered: dependencies weren't audited recursively; binaries and archives can't be reviewed by reading;
  a static review can't prove a skill is safe. **Re-audit after every update.**
