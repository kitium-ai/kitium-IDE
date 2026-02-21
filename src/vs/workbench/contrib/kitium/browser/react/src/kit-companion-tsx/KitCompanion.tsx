// Kitium — Kit Companion overlay (self-contained, no Zustand)

import { useRef, useEffect, useState, useCallback } from 'react'
import KitCharacter, { type KitCharacterState, type KitEvolutionStage } from './KitCharacter.js'

interface KitCompanionProps {
	onOpenChat: () => void
	onExecuteCommand?: (cmd: string) => void
	stage?: KitEvolutionStage
}

const CODY_W = 120
const CODY_H = 200
const IDLE_TIMEOUT = 5 * 60 * 1000
const DRAG_THRESH = 5

export default function KitCompanion({ onOpenChat, stage = 1 }: KitCompanionProps) {
	const [pos, setPos] = useState({ x: -1, y: -1 })
	const [charState, setCharState] = useState<KitCharacterState>('idle')
	const [chatOpen, setChatOpen] = useState(false)

	// Drag state (refs to avoid stale closure in listeners)
	const isDragging = useRef(false)
	const dragStartPos = useRef({ x: 0, y: 0 })
	const dragStartKit = useRef({ x: 0, y: 0 })
	const hasDragged = useRef(false)
	const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const posRef = useRef(pos)
	posRef.current = pos

	// Init position bottom-right
	useEffect(() => {
		setPos({
			x: window.innerWidth - CODY_W - 28,
			y: window.innerHeight - CODY_H - 60
		})
	}, [])

	// Idle/sleep timer
	const resetIdleTimer = useCallback(() => {
		setCharState(s => s === 'sleeping' ? 'watching' : s)
		if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
		idleTimerRef.current = setTimeout(() => {
			setCharState(s => (s === 'idle' || s === 'watching') ? 'sleeping' : s)
		}, IDLE_TIMEOUT)
	}, [])

	useEffect(() => {
		resetIdleTimer()
		window.addEventListener('keydown', resetIdleTimer)
		window.addEventListener('mousemove', resetIdleTimer)
		return () => {
			window.removeEventListener('keydown', resetIdleTimer)
			window.removeEventListener('mousemove', resetIdleTimer)
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
		}
	}, [resetIdleTimer])

	// Drag
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		isDragging.current = true
		hasDragged.current = false
		dragStartPos.current = { x: e.clientX, y: e.clientY }
		dragStartKit.current = { x: posRef.current.x, y: posRef.current.y }
		e.preventDefault()
	}, [])

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			if (!isDragging.current) return
			const dx = e.clientX - dragStartPos.current.x
			const dy = e.clientY - dragStartPos.current.y
			if (!hasDragged.current && Math.hypot(dx, dy) < DRAG_THRESH) return
			hasDragged.current = true
			setPos({
				x: Math.max(0, Math.min(window.innerWidth - CODY_W, dragStartKit.current.x + dx)),
				y: Math.max(0, Math.min(window.innerHeight - CODY_H, dragStartKit.current.y + dy))
			})
		}
		const onUp = () => {
			if (isDragging.current && !hasDragged.current) {
				setChatOpen(o => !o)
				setCharState('talking')
				setTimeout(() => setCharState('idle'), 2000)
				onOpenChat()
			}
			isDragging.current = false
		}
		window.addEventListener('mousemove', onMove)
		window.addEventListener('mouseup', onUp)
		return () => {
			window.removeEventListener('mousemove', onMove)
			window.removeEventListener('mouseup', onUp)
		}
	}, [onOpenChat])

	if (pos.x === -1) return null

	return (
		<div
			style={{
				position: 'fixed',
				left: pos.x,
				top: pos.y,
				zIndex: 9999,
				width: CODY_W,
				height: CODY_H,
				userSelect: 'none',
				cursor: 'pointer',
				pointerEvents: 'all',
			}}
			onMouseDown={handleMouseDown}
		>
			<div style={{
				position: 'relative',
				transform: chatOpen ? 'scale(1.08)' : 'scale(1)',
				transition: 'transform 150ms ease',
			}}>
				<div style={{ width: CODY_W, height: CODY_H, pointerEvents: 'none' }}>
					<KitCharacter amplitude={0} state={charState} stage={stage} />
				</div>

				{/* Tooltip on hover */}
				<div style={{
					position: 'absolute',
					bottom: '100%',
					left: '50%',
					transform: 'translateX(-50%)',
					marginBottom: 12,
					pointerEvents: 'none',
					whiteSpace: 'nowrap',
					background: 'var(--vscode-editorWidget-background, #1e1e1e)',
					border: '1px solid var(--vscode-editorWidget-border, #454545)',
					color: 'var(--vscode-descriptionForeground, #888)',
					fontSize: 10,
					padding: '3px 8px',
					borderRadius: 4,
					boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
					opacity: 0,
				}}
				className="kit-tooltip"
				>
					Kit · click to chat
				</div>
			</div>

			<style>{`
				div:hover > div > .kit-tooltip { opacity: 1 !important; transition: opacity 200ms; }
			`}</style>
		</div>
	)
}
