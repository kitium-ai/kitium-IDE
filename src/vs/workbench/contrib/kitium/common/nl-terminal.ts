// Kitium — NL Terminal engine (ported from KitStudio)

export type SuggestionSafety = 'safe' | 'caution' | 'danger'

export interface TerminalSuggestion {
	command: string
	title: string
	rationale: string
	safety: SuggestionSafety
}

export type OutputAction =
	| { type: 'error'; message: string }
	| { type: 'url'; url: string }
	| { type: 'filepath'; path: string }
	| { type: 'port'; port: number }

const DANGEROUS_PATTERNS = [
	/rm\s+-rf/i, /mkfs/i, /dd\s+if=/i,
	/:\(\)\s*{\s*:\|:\s*&\s*};:/,
	/shutdown|reboot/i, /git\s+reset\s+--hard/i,
]

export function isDangerousCommand(command: string): boolean {
	return DANGEROUS_PATTERNS.some((p) => p.test(command.trim()))
}

export function isLikelyRawShell(input: string): boolean {
	const t = input.trim()
	if (!t) return false
	if (t.startsWith('`') && t.endsWith('`')) return true
	return /^(npm|pnpm|yarn|git|ls|cd|pwd|cat|echo|node|python|pip|docker|kubectl|make|rm|cp|mv|touch|mkdir|npx|brew|cargo|go|lsof|kill|netstat|find|du|printenv|grep|rg|curl|wget|ssh|tsc|eslint|prettier|biome|pytest)\b/i.test(t)
}

export function buildTerminalSuggestions(
	input: string,
	packageManager: 'npm' | 'pnpm' | 'yarn' = 'npm',
): TerminalSuggestion[] {
	const raw = input.trim()
	if (!raw) return []

	if (isLikelyRawShell(raw)) {
		const unwrapped = raw.startsWith('`') && raw.endsWith('`') ? raw.slice(1, -1).trim() : raw
		return [{ command: unwrapped, title: 'Run shell command', rationale: 'Detected direct shell syntax.', safety: isDangerousCommand(unwrapped) ? 'danger' : 'safe' }]
	}

	const q = raw.toLowerCase()
	const pm = packageManager
	const list: TerminalSuggestion[] = []

	const has = (needles: string[]) => needles.some(n => q.includes(n))

	if (has(['install dependencies', 'install deps', 'setup project', 'install packages']))
		list.push({ command: `${pm} install`, title: 'Install dependencies', rationale: `Uses ${pm} lockfile.`, safety: 'safe' })

	if (has(['run test', 'execute tests', 'test project', 'run tests']))
		list.push({ command: `${pm} test`, title: 'Run tests', rationale: 'Runs project test script.', safety: 'safe' })

	if (has(['start dev', 'run dev', 'start project', 'launch app', 'dev server']))
		list.push({ command: `${pm} run dev`, title: 'Run dev server', rationale: 'Starts local dev script.', safety: 'safe' })

	if (has(['build project', 'build app', 'production build', 'compile project']))
		list.push({ command: `${pm} run build`, title: 'Build project', rationale: 'Runs production build.', safety: 'safe' })

	if (has(['git status', 'repo status', 'check git']))
		list.push({ command: 'git status', title: 'Git status', rationale: 'Shows staged/unstaged files.', safety: 'safe' })

	if (has(['git log', 'show commits', 'commit history']))
		list.push({ command: 'git log --oneline -20', title: 'Recent commits', rationale: 'Last 20 commits.', safety: 'safe' })

	if (has(['git stash', 'stash changes']))
		list.push({ command: 'git stash', title: 'Stash changes', rationale: 'Saves uncommitted work.', safety: 'safe' })

	if (has(['pop stash', 'restore stash', 'unstash']))
		list.push({ command: 'git stash pop', title: 'Pop stash', rationale: 'Restores stashed changes.', safety: 'safe' })

	if (has(['push upstream', 'push branch', 'push to remote']))
		list.push({ command: 'git push --set-upstream origin HEAD', title: 'Push branch', rationale: 'Pushes and sets upstream.', safety: 'caution' })

	if (q.includes('create branch') || q.includes('new branch')) {
		const name = extractBranchName(raw)
		list.push({ command: `git checkout -b ${name}`, title: 'Create branch', rationale: 'New feature branch.', safety: 'caution' })
	}

	if (has(['docker ps', 'running containers', 'list containers']))
		list.push({ command: 'docker ps', title: 'Docker containers', rationale: 'Lists running containers.', safety: 'safe' })

	if (has(['docker compose up', 'start services', 'docker up']))
		list.push({ command: 'docker compose up -d', title: 'Start Compose services', rationale: 'Detached mode.', safety: 'safe' })

	if (has(['docker compose down', 'stop services', 'docker down']))
		list.push({ command: 'docker compose down', title: 'Stop Compose services', rationale: 'Stops containers.', safety: 'caution' })

	if (has(['type check', 'typescript check', 'check types', 'typecheck']))
		list.push({ command: 'tsc --noEmit', title: 'TypeScript check', rationale: 'Type-check only, no emit.', safety: 'safe' })

	if (has(['lint', 'eslint', 'fix lint']))
		list.push({ command: 'eslint . --fix', title: 'ESLint fix', rationale: 'Lint + auto-fix.', safety: 'safe' })

	if (has(['format code', 'prettier', 'format files']))
		list.push({ command: 'prettier --write .', title: 'Format with Prettier', rationale: 'Reformats all files.', safety: 'safe' })

	if (has(['prisma migrate', 'db migrate', 'run migration']))
		list.push({ command: 'npx prisma migrate dev', title: 'Prisma migration', rationale: 'Apply DB migrations.', safety: 'caution' })

	if (has(['kill port', 'free port', 'stop port'])) {
		const port = extractPort(raw) || '3000'
		list.push({ command: `lsof -ti :${port} | xargs kill`, title: `Kill port ${port}`, rationale: `Kill process on :${port}.`, safety: 'danger' })
	}

	if (has(['check port', 'who is on port'])) {
		const port = extractPort(raw) || '3000'
		list.push({ command: `lsof -i :${port}`, title: `Check port ${port}`, rationale: `Who's using :${port}.`, safety: 'safe' })
	}

	if (has(['install requirements', 'python deps', 'pip install']))
		list.push({ command: 'pip install -r requirements.txt', title: 'Python deps', rationale: 'Install from requirements.txt.', safety: 'safe' })

	if (has(['run pytest', 'python tests', 'pytest']))
		list.push({ command: 'pytest', title: 'Run pytest', rationale: 'Runs Python tests.', safety: 'safe' })

	if (has(['env variables', 'show env', 'list env']))
		list.push({ command: 'printenv | grep NODE', title: 'Show env', rationale: 'Node-related env vars.', safety: 'safe' })

	if (has(['copy env', 'create env', 'env example']))
		list.push({ command: 'cp .env.example .env', title: 'Copy .env', rationale: 'Create .env from example.', safety: 'safe' })

	if (q.includes('find text') || q.includes('search text') || q.includes('grep')) {
		const term = extractQuoted(raw) || 'TODO'
		list.push({ command: `rg --line-number "${esc(term)}" .`, title: 'Search text', rationale: 'ripgrep search.', safety: 'safe' })
	}

	if (has(['outdated packages', 'check outdated']))
		list.push({ command: `${pm} outdated`, title: 'Outdated packages', rationale: 'Check for updates.', safety: 'safe' })

	if (list.length > 0) return dedupe(list)
	return [{ command: `echo "${esc(raw)}"`, title: 'No match', rationale: 'No intent recognised — try a direct command.', safety: 'caution' }]
}

export function parseOutputForActions(output: string): OutputAction[] {
	const actions: OutputAction[] = []
	const seen = new Set<string>()
	const add = (key: string, a: OutputAction) => { if (!seen.has(key)) { seen.add(key); actions.push(a) } }

	for (const m of output.matchAll(/https?:\/\/localhost:\d+[^\s\])'"<]*/g))
		add(m[0], { type: 'url', url: m[0] })

	for (const m of output.matchAll(/(?:listening on|on port|port)\s+:?(\d{4,5})/gi)) {
		const port = parseInt(m[1], 10)
		if (!seen.has(`http://localhost:${port}`)) add(`port:${port}`, { type: 'port', port })
	}

	for (const m of output.matchAll(/\b((?:src|lib|app|pages|components|hooks|utils|tests?)\/?[^\s:'"<>()[\]]+\.[a-z]{2,4}(?::\d+)?)/gi))
		if (m[1].length < 100) add(m[1], { type: 'filepath', path: m[1] })

	const errorPatterns = [/TypeError:\s+(.+)/, /SyntaxError:\s+(.+)/, /Error:\s+(.+)/, /error TS\d+:\s+(.+)/i, /ERR!\s+(.+)/]
	for (const p of errorPatterns) {
		const m = output.match(p)
		if (m) { add(`err:${m[1]}`, { type: 'error', message: m[1].trim() }); break }
	}

	return actions
}

function dedupe(items: TerminalSuggestion[]): TerminalSuggestion[] {
	const seen = new Set<string>(); const out: TerminalSuggestion[] = []
	for (const item of items) { if (!seen.has(item.command)) { seen.add(item.command); out.push(item) } }
	return out
}
function extractQuoted(s: string): string | null { return (s.match(/"([^"]+)"/) || s.match(/'([^']+)'/)) ?.[1] ?? null }
function extractPort(s: string): string | null { return s.match(/\b(\d{4,5})\b/)?.[1] ?? null }
function extractBranchName(s: string): string {
	const q = extractQuoted(s); if (q) return slug(q)
	const a = s.toLowerCase().split('branch')[1]?.trim(); if (a) return slug(a)
	return `feature/${Date.now()}`
}
function slug(s: string): string { return s.trim().toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/^-+|-+$/g, '') || `feature/${Date.now()}` }
function esc(s: string): string { return s.replace(/"/g, '\\"') }
