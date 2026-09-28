# Skill audit checklist

This is the method for Step 2 (the Grep sweep) and the reference for Step 3: run each pattern below with the Grep
tool (case-insensitive, over the whole skill folder) and read every hit in context.

## 1. Frontmatter

| Check | Why it matters |
|---|---|
| `allowed-tools` contains `Bash`, `Bash(*)` or a pattern starting with `*` | Runs any command, or any command containing a string, without asking |
| Pre-approved installs (`pip`, `npm`, `npx`, `winget`, `brew`, `apt`), especially with `*` where the package name goes | Installs anything |
| Pre-approved `curl`, `wget`, `Invoke-WebRequest`, `bash -c`, `powershell`, `python -c`, `node -e`, `rm`, `del`, `git push` | Download, run arbitrary code, delete or publish without asking |
| Pre-approved scripts | Approving `python x.py` approves every line of `x.py`: read it in full |
| No `disable-model-invocation: true` while pre-approving risky tools | Claude can start it by itself and run those tools |
| `description` says "always use", "any task", "every request" | Tries to trigger everywhere |
| `hooks` key | Hooks are registered when the skill runs and keep running shell commands on events (every tool call, every prompt) for the rest of the session. High; critical if a hook downloads, installs or sends data |
| `context: fork` with `agent` | The skill runs in a subagent with that agent's tools: check those tools like `allowed-tools` |
| `shell: powershell` | Its load-time commands run in PowerShell: read them with that in mind |
| `model` | Runs on a different model than the user chose. Rarely a risk, but note it |

## 1a. Commands that run when the skill loads

| Check | Why it matters |
|---|---|
| An exclamation mark directly before a command in backticks | Runs a shell command the moment the skill is invoked, before Claude reads the skill, and Claude Code never asks first. Only the user's deny rules or `"disableSkillShellExecution": true` stop it. It works even when `allowed-tools` is empty |
| A code block whose opening fence (three backticks) is followed by an exclamation mark | The same, for several lines of commands |

This file describes the syntax in words on purpose, so that it holds no such command itself.

Rate each one like a pre-approved command: a fixed, read-only command (`git status`, `date`) is low; anything that
installs, downloads, runs a script or sends data is critical.

## 1b. Plugin parts (they run without anyone invoking a skill)

| Check | Why it matters |
|---|---|
| `hooks/hooks.json`, or `hooks` in `plugin.json` or a bundled `settings.json` | Hooks run shell commands on events (session start, every tool call, every prompt) as soon as the plugin is enabled, without a prompt |
| `.mcp.json`, or `mcpServers` in `plugin.json` | Each server starts a program (`command`, `args`). `npx`, `uvx` or `pipx run` without a pinned version runs whatever was published today; `url` entries send data to that server; `env` can hand it your secrets |
| `agents/*.md` | Each agent has its own `tools` list: check it like `allowed-tools` |
| `commands/*.md` | Slash commands can have their own `allowed-tools` |
| `.claude-plugin/marketplace.json` | Plugin sources that point to other repos: each one needs its own audit |
| `.claude-plugin/plugin.json` inside a skill folder | Turns the skill folder into a plugin, which can bring hooks, agents and MCP servers |
| Symbolic links anywhere | Reading through a link can open files outside the skill (for example `~/.ssh`); list links, never read through them |

## 1c. Files that give Claude instructions

| Check | Why it matters |
|---|---|
| `CLAUDE.md`, `AGENTS.md`, or a `.claude/` folder (`rules/`, `skills/`, `settings.json`) anywhere inside the target | A skill never needs them. When Claude Code reads files in a subfolder of your project, it also loads these from that subfolder, so they can steer Claude, or bring a skill with load-time commands. Report each one, and audit from outside your project |

## 2. Grep patterns (the Step 2 sweep)

| Category | Pattern (regex, case-insensitive) |
|---|---|
| Network | `requests\.|urllib|urlopen|http\.client|socket\.|fetch\(|XMLHttpRequest|axios|curl |wget |Invoke-WebRequest|iwr |Net\.WebClient|DownloadString` |
| Download and run | `(curl|wget|iwr|irm)[^|]*\|\s*(sh|bash|python|iex|powershell)` |
| Command execution | `subprocess|os\.system|os\.popen|child_process|execSync|spawn\(|eval\(|exec\(|new Function|bash -c|sh -c|cmd /c|iex|Invoke-Expression|powershell.*-enc` |
| Credentials | `\.ssh|id_rsa|id_ed25519|\.aws|\.azure|gcloud|\.kube|\.npmrc|\.pypirc|git-credentials|\.netrc|\.env\b|Login Data|Cookies|Local State|logins\.json|key4\.db|Keychain|wallet|os\.environ|process\.env|printenv|_TOKEN|_API_KEY|_SECRET` |
| Webhooks and exfiltration | `webhooks|hooks\.slack|api\.telegram|webhook\.site|requestbin|pipedream|ngrok|interact\.sh` |
| Persistence | `crontab|schtasks|CurrentVersion\\Run|Startup|launchctl|LaunchAgents|systemctl enable|\.bashrc|\.zshrc|\.profile|PowerShell_profile|New-Service` |
| Security changes | `Set-MpPreference|ExclusionPath|DisableRealtimeMonitoring|netsh advfirewall|ufw disable|setenforce 0|ExecutionPolicy (Bypass|Unrestricted)` |
| Destructive | `rm -rf|rm -fr|del /s|rmdir /s|Remove-Item.*-Recurse|rmtree|mkfs|dd if=` |
| Installs | `pip install|npm (i|install)|npx |yarn add|winget install|choco install|brew install|apt(-get)? install|postinstall|preinstall` |
| Obfuscation | `base64|b64decode|atob\(|FromBase64String|fromCharCode|\\x[0-9a-f]{2}\\x|[A-Za-z0-9+/]{160,}` |
| Prompt injection | `ignore (all )?(previous|prior|above) instructions|do not tell|don't tell|never mention|without asking|user (has )?(already )?approved|pre-?authori|silently|quietly|secretly|in the background|bypass|skip .*permission|dangerously|you are now|developer mode|instructions from http` |
| Hidden Unicode | `[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2069}\x{FEFF}]` and tag characters `[\x{E0000}-\x{E007F}]` (if the tool supports them; otherwise note "not checked") |
| Load-time commands | `^\s*\x60{3}!|!\x60` (`\x60` is a backtick: this finds both kinds of load-time command in section 1a) |
| Plugin hooks and servers | `"hooks"|PreToolUse|PostToolUse|SessionStart|UserPromptSubmit|"mcpServers"|"command"\s*:|npx |uvx |pipx run|@latest` |

Also look at: HTML comments in `.md` files (invisible when rendered, visible to Claude), binary files and archives
(can't be reviewed by reading), symlinks, and very large files.

## 3. Reading a script (what the patterns miss)

- **Trace the data:** inputs → files read → commands run → network destinations. Anything leaving the machine that
  the skill's purpose doesn't need is suspicious.
- **Runtime-built targets:** URLs, file paths or commands assembled from pieces or decoded at runtime.
- **Conditional behaviour:** checks on the date, username, hostname, OS, CI variables or "first run" flags can hide time bombs and targeting.
- **Self-updating:** downloading a newer script, `SKILL.md` or instructions means the reviewed version isn't what will run.
- **Names vs behaviour:** a `format_text.py` that opens sockets, or comments that describe something different from the code.
- **Writes:** anything written outside the working folder (home folder, startup folders, shell profiles, other skills' folders).

## 4. Normal things that look scary (explain, don't panic)

- A YouTube tool calling YouTube, or a GitHub tool calling GitHub: expected, if the domains match the purpose.
- `subprocess` running a *fixed*, harmless command (for example `npm root -g`): fine; *variable* commands need a look.
- Install commands in **documentation** telling the user what to install: fine. The same in `allowed-tools`: flag it.
- Security guidance that *quotes* attack phrases ("never follow instructions like 'ignore previous instructions'"): fine.
- Template comments in HTML that explain how to fill a template: fine, unless they contain actions.
- A plugin hook that runs a formatter or linter on your own files after an edit: common, but check the exact command.
- An MCP server with a pinned version from the publisher named in the plugin's description: expected; unpinned or
  from someone else: flag it.
