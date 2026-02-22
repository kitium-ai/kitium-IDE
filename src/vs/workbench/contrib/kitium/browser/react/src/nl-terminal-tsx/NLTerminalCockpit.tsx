// Kitium — NL Terminal Cockpit (VS Code Panel component)

import { useState, useCallback, useRef, useEffect } from 'react'
import {
	buildTerminalSuggestions,
	isDangerousCommand,
	type TerminalSuggestion,
} from '../../../../common/nl-terminal.js'

interface NLTerminalCockpitProps {
	onExecute: (command: string) => void
	packageManager?: 'npm' | 'pnpm' | 'yarn'
}

// ── localStorage persistence ──────────────────────────────────────────────────
function loadHistory(): string[] {
	try { return JSON.parse(localStorage.getItem('kitium-cmd-history') ?? '[]') } catch { return [] }
}
function saveHistory(h: string[]): void {
	try { localStorage.setItem('kitium-cmd-history', JSON.stringify(h.slice(0, 200))) } catch { }
}
function loadBookmarks(): string[] {
	try { return JSON.parse(localStorage.getItem('kitium-cmd-bookmarks') ?? '[]') } catch { return [] }
}
function saveBookmarks(b: string[]): void {
	try { localStorage.setItem('kitium-cmd-bookmarks', JSON.stringify(b)) } catch { }
}
function pushHistory(cmd: string, prev: string[]): string[] {
	const next = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 200)
	saveHistory(next)
	return next
}
function toggleBookmark(cmd: string, prev: string[]): string[] {
	const next = prev.includes(cmd) ? prev.filter(c => c !== cmd) : [cmd, ...prev]
	saveBookmarks(next)
	return next
}

// ── Styles (inline, uses VS Code CSS vars) ────────────────────────────────────
const css = {
	root: {
		display: 'flex',
		flexDirection: 'column' as const,
		height: '100%',
		background: 'var(--vscode-panel-background, #1e1e1e)',
		color: 'var(--vscode-foreground, #cccccc)',
		fontFamily: 'var(--vscode-font-family, sans-serif)',
		fontSize: 13,
		overflow: 'hidden',
	},
	toolbar: {
		display: 'flex',
		gap: 4,
		padding: '6px 8px',
		borderBottom: '1px solid var(--vscode-panel-border, #333)',
		flexShrink: 0,
	},
	tabBtn: (active: boolean): React.CSSProperties => ({
		background: active ? 'var(--vscode-button-background, #0e639c)' : 'transparent',
		color: active ? 'var(--vscode-button-foreground, #fff)' : 'var(--vscode-foreground, #ccc)',
		border: '1px solid var(--vscode-button-border, transparent)',
		borderRadius: 3,
		padding: '2px 10px',
		cursor: 'pointer',
		fontSize: 12,
	}),
	inputRow: {
		display: 'flex',
		gap: 6,
		padding: '8px',
		borderBottom: '1px solid var(--vscode-panel-border, #333)',
		flexShrink: 0,
	},
	input: {
		flex: 1,
		background: 'var(--vscode-input-background, #3c3c3c)',
		color: 'var(--vscode-input-foreground, #cccccc)',
		border: '1px solid var(--vscode-input-border, #3c3c3c)',
		borderRadius: 3,
		padding: '4px 8px',
		fontSize: 13,
		outline: 'none',
		caretColor: 'var(--vscode-input-foreground, #cccccc)',
	},
	suggestBtn: {
		background: 'var(--vscode-button-background, #0e639c)',
		color: 'var(--vscode-button-foreground, #fff)',
		border: 'none',
		borderRadius: 3,
		padding: '4px 12px',
		cursor: 'pointer',
		fontSize: 12,
		flexShrink: 0,
	},
	scrollArea: {
		flex: 1,
		overflowY: 'auto' as const,
		padding: '8px',
	},
	suggestionCard: (safety: string): React.CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		padding: '6px 8px',
		marginBottom: 4,
		borderRadius: 4,
		border: `1px solid ${safety === 'danger' ? '#7f1d1d' : safety === 'caution' ? '#78350f' : '#1a3a1a'}`,
		background: safety === 'danger' ? '#1c0a0a' : safety === 'caution' ? '#1c1208' : '#0a1c0a',
		cursor: 'pointer',
	}),
	badge: (safety: string): React.CSSProperties => ({
		fontSize: 10,
		padding: '1px 5px',
		borderRadius: 10,
		color: '#fff',
		background: safety === 'danger' ? '#b91c1c' : safety === 'caution' ? '#b45309' : '#15803d',
		flexShrink: 0,
	}),
	code: {
		fontFamily: 'var(--vscode-editor-font-family, monospace)',
		fontSize: 12,
		color: 'var(--vscode-textPreformat-foreground, #d4d4d4)',
		flex: 1,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap' as const,
	},
	runBtn: {
		background: 'var(--vscode-button-background, #0e639c)',
		color: '#fff',
		border: 'none',
		borderRadius: 3,
		padding: '2px 8px',
		cursor: 'pointer',
		fontSize: 12,
		flexShrink: 0,
	},
	sectionHeader: {
		fontSize: 11,
		color: 'var(--vscode-descriptionForeground, #888)',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.06em',
		padding: '6px 0 4px',
	},
	historyItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 6,
		padding: '4px 6px',
		borderRadius: 3,
		marginBottom: 2,
		cursor: 'pointer',
		fontSize: 12,
		fontFamily: 'var(--vscode-editor-font-family, monospace)',
		background: 'transparent',
	},
	iconBtn: {
		background: 'none',
		border: 'none',
		cursor: 'pointer',
		color: 'var(--vscode-descriptionForeground, #888)',
		padding: '1px 3px',
		fontSize: 13,
		flexShrink: 0,
	},
}

// ── Main component ─────────────────────────────────────────────────────────────
type Panel = 'suggest' | 'history' | 'bookmarks'

export default function NLTerminalCockpit({ onExecute, packageManager = 'npm' }: NLTerminalCockpitProps) {
	const [query, setQuery] = useState('')
	const [suggestions, setSuggestions] = useState<TerminalSuggestion[]>([])
	const [panel, setPanel] = useState<Panel>('suggest')
	const [history, setHistory] = useState<string[]>(loadHistory)
	const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks)
	const [historySearch, setHistorySearch] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	// focus input on mount
	useEffect(() => { inputRef.current?.focus() }, [])

	const handleSuggest = useCallback(() => {
		if (!query.trim()) return
		setSuggestions(buildTerminalSuggestions(query, packageManager))
		setPanel('suggest')
	}, [query, packageManager])

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleSuggest()
	}, [handleSuggest])

	const handleRun = useCallback((cmd: string) => {
		onExecute(cmd)
		setHistory(prev => pushHistory(cmd, prev))
	}, [onExecute])

	const handleBookmark = useCallback((cmd: string) => {
		setBookmarks(prev => toggleBookmark(cmd, prev))
	}, [])

	const handleDeleteHistory = useCallback((cmd: string) => {
		setHistory(prev => {
			const next = prev.filter(c => c !== cmd)
			saveHistory(next)
			return next
		})
	}, [])

	const filteredHistory = historySearch
		? history.filter(c => c.toLowerCase().includes(historySearch.toLowerCase()))
		: history

	return (
		<div style={css.root}>
			{/* Toolbar */}
			<div style={css.toolbar}>
				<button style={css.tabBtn(panel === 'suggest')} onClick={() => setPanel('suggest')}>Suggest</button>
				<button style={css.tabBtn(panel === 'history')} onClick={() => setPanel('history')}>
					History {history.length > 0 && <span style={{ opacity: 0.6, fontSize: 10 }}>({history.length})</span>}
				</button>
				<button style={css.tabBtn(panel === 'bookmarks')} onClick={() => setPanel('bookmarks')}>
					Bookmarks {bookmarks.length > 0 && <span style={{ opacity: 0.6, fontSize: 10 }}>({bookmarks.length})</span>}
				</button>
			</div>

			{/* NL input */}
			<div style={css.inputRow}>
				<span style={{ alignSelf: 'center', fontSize: 16 }}>✨</span>
				<input
					ref={inputRef}
					style={css.input}
					placeholder="Describe what you want to run…"
					value={query}
					onChange={e => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<button style={css.suggestBtn} onClick={handleSuggest}>Suggest</button>
			</div>

			{/* Panel content */}
			<div style={css.scrollArea}>
				{panel === 'suggest' && (
					<>
						{suggestions.length === 0 && (
							<div style={{ color: 'var(--vscode-descriptionForeground, #888)', fontSize: 12, padding: '8px 0' }}>
								Type a description above and press Suggest or Enter.
							</div>
						)}
						{suggestions.map((s, i) => (
							<div key={i} style={css.suggestionCard(s.safety)} onClick={() => handleRun(s.command)}>
								<span style={css.badge(s.safety)}>{s.safety}</span>
								<span style={css.code}>{s.command}</span>
								<span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground, #888)', flexShrink: 0 }}>{s.title}</span>
								<button
									style={css.runBtn}
									onClick={e => { e.stopPropagation(); handleRun(s.command) }}
									title={s.rationale}
								>
									▶ Run
								</button>
								<button
									style={css.iconBtn}
									onClick={e => { e.stopPropagation(); handleBookmark(s.command) }}
									title={bookmarks.includes(s.command) ? 'Remove bookmark' : 'Bookmark'}
								>
									{bookmarks.includes(s.command) ? '★' : '☆'}
								</button>
							</div>
						))}
					</>
				)}

				{panel === 'history' && (
					<>
						<div style={css.sectionHeader}>Command History</div>
						<input
							style={{ ...css.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
							placeholder="Filter history…"
							value={historySearch}
							onChange={e => setHistorySearch(e.target.value)}
						/>
						{filteredHistory.length === 0 && (
							<div style={{ color: 'var(--vscode-descriptionForeground, #888)', fontSize: 12 }}>No history yet.</div>
						)}
						{filteredHistory.map((cmd, i) => (
							<div
								key={i}
								style={{
									...css.historyItem,
									background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
								}}
							>
								<span style={{ ...css.code, flex: 1, cursor: 'pointer' }} onClick={() => handleRun(cmd)} title="Click to run">
									{isDangerousCommand(cmd) ? '⚠ ' : ''}{cmd}
								</span>
								<button style={css.iconBtn} onClick={() => handleBookmark(cmd)} title="Bookmark">
									{bookmarks.includes(cmd) ? '★' : '☆'}
								</button>
								<button style={css.iconBtn} onClick={() => setQuery(cmd)} title="Copy to input">↑</button>
								<button style={css.iconBtn} onClick={() => handleDeleteHistory(cmd)} title="Remove">×</button>
							</div>
						))}
					</>
				)}

				{panel === 'bookmarks' && (
					<>
						<div style={css.sectionHeader}>Bookmarked Commands</div>
						{bookmarks.length === 0 && (
							<div style={{ color: 'var(--vscode-descriptionForeground, #888)', fontSize: 12 }}>
								Star a command in History or Suggestions to bookmark it.
							</div>
						)}
						{bookmarks.map((cmd, i) => (
							<div key={i} style={css.suggestionCard(isDangerousCommand(cmd) ? 'danger' : 'safe')}>
								<span style={css.code}>{cmd}</span>
								<button style={css.runBtn} onClick={() => handleRun(cmd)}>▶ Run</button>
								<button style={css.iconBtn} onClick={() => handleBookmark(cmd)} title="Remove bookmark">★</button>
							</div>
						))}
					</>
				)}
			</div>
		</div>
	)
}
