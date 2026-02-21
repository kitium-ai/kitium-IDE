// Kitium — Kit Character (ported from KitStudio, self-contained types)

import { useRef, useEffect } from 'react'

export type KitEvolutionStage = 1 | 2 | 3 | 4 | 5
export type KitCharacterState =
	| 'idle' | 'watching' | 'thinking' | 'talking'
	| 'listening' | 'excited' | 'celebrating' | 'concerned' | 'sleeping'

interface KitCharacterProps {
	stage: KitEvolutionStage
	state: KitCharacterState
	width?: number
	height?: number
	amplitude?: number   // 0–1, from always-on voice for ear-cup glow
}

// ── Palette ───────────────────────────────────────────────────────────────────
const SKIN      = '#FBBF8A'
const SKIN_SH   = '#D4956A'
const SKIN_HL   = '#FDD5A8'
const HAIR      = '#2D1B0E'
const HP        = '#1D4ED8'
const HP_DARK   = '#1E3A8A'
const SHIRT     = '#0F172A'
const SHIRT_HL  = '#1E293B'
const PANTS     = '#1E293B'
const PANTS_SH  = '#111827'
const SHOES     = '#111827'
const AMBER     = '#F59E0B'
const GREEN     = '#10B981'
const RED       = '#EF4444'
const PURPLE    = '#7C3AED'

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

export default function KitCharacter({
	stage,
	state,
	width  = 120,
	height = 200,
	amplitude = 0
}: KitCharacterProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const rafRef    = useRef<number | null>(null)
	const parts     = useRef<Particle[]>([])

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const dpr = window.devicePixelRatio || 1
		canvas.width  = width  * dpr
		canvas.height = height * dpr
		canvas.style.width  = `${width}px`
		canvas.style.height = `${height}px`
		ctx.scale(dpr, dpr)

		const draw = () => {
			ctx.clearRect(0, 0, width, height)
			drawCody(ctx, width, height, Date.now(), state, stage, amplitude, parts.current)
			rafRef.current = requestAnimationFrame(draw)
		}
		rafRef.current = requestAnimationFrame(draw)
		return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
	}, [stage, state, width, height, amplitude])

	return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />
}

function drawCody(
	ctx: CanvasRenderingContext2D,
	W: number, H: number,
	now: number,
	state: KitCharacterState,
	stage: KitEvolutionStage,
	amplitude: number,
	parts: Particle[]
) {
	const S  = W / 120
	const cx = W / 2

	const breathe = Math.sin(now / 950) * 0.009
	const isAsleep = state === 'sleeping'
	const isCelebrate = state === 'excited' || state === 'celebrating'

	const jumpY   = isCelebrate ? -Math.abs(Math.sin(now / 260)) * 10 * S : 0
	const shakeX  = state === 'concerned' ? Math.sin(now / 55) * 2.5 * S : 0

	const idleSwing = Math.sin(now / 1400) * 0.04
	let leftArmAngle  = 0.10 + idleSwing
	let rightArmAngle = -0.10 - idleSwing

	if (state === 'thinking') {
		rightArmAngle = -0.55
		leftArmAngle  = 0.12
	} else if (state === 'talking') {
		rightArmAngle = -0.3 + Math.sin(now / 280) * 0.12
		leftArmAngle  = 0.10
	} else if (isCelebrate) {
		leftArmAngle  = -0.65 + Math.sin(now / 200) * 0.1
		rightArmAngle = 0.65 - Math.sin(now / 200) * 0.1
	} else if (state === 'concerned') {
		leftArmAngle  = 0.35
		rightArmAngle = -0.35
	} else if (isAsleep) {
		leftArmAngle  = 0.05
		rightArmAngle = -0.05
	}

	const headR  = 18 * S
	const headCx = cx + shakeX
	const headCy = 26 * S + jumpY

	const neckW  = 13 * S
	const neckT  = headCy + headR - 2 * S
	const neckB  = neckT + 10 * S

	const shY    = neckB
	const shHW   = 28 * S
	const waistY = shY + 42 * S
	const waistHW = 17 * S

	const hipY   = waistY + 8 * S
	const hipHW  = 21 * S

	const crotchY = hipY + 14 * S
	const kneeY   = crotchY + 30 * S
	const ankleY  = kneeY + 28 * S
	const footY   = ankleY + 7 * S

	const legHW   = 9 * S
	const ankHW   = 7 * S

	const armLen  = 32 * S
	const armW    = 9  * S
	const foreLen = 26 * S
	const foreW   = 7  * S

	if (stage === 5) {
		const hy = headCy - headR * 1.28 + Math.sin(now / 700) * 2 * S
		ctx.strokeStyle = `${AMBER}CC`
		ctx.lineWidth   = 2.5 * S
		ctx.beginPath()
		ctx.ellipse(headCx, hy, headR * 0.78, headR * 0.22, 0, 0, Math.PI * 2)
		ctx.stroke()
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + now / 1800
			ctx.fillStyle = `${AMBER}80`
			ctx.beginPath()
			ctx.arc(headCx + Math.cos(a) * headR * 0.80, hy + Math.sin(a) * headR * 0.23, 1.5 * S, 0, Math.PI * 2)
			ctx.fill()
		}
	}

	const shadowOpacity = 0.12 + amplitude * 0.06
	ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`
	ctx.beginPath()
	ctx.ellipse(cx, footY + 10 * S - jumpY * 0.3, 28 * S, 5 * S, 0, 0, Math.PI * 2)
	ctx.fill()

	ctx.save()
	ctx.translate(cx, H / 2)
	ctx.scale(1, 1 + breathe)
	ctx.translate(-cx, -H / 2)

	drawShoe(ctx, headCx - legHW - 3 * S, footY, -0.12, S)
	drawShoe(ctx, headCx + legHW + 3 * S, footY,  0.12, S)

	ctx.fillStyle = PANTS
	roundedRect(ctx, headCx - ankHW - 5 * S, kneeY, ankHW * 2 + 2 * S, ankleY - kneeY, 4 * S)
	ctx.fill()
	roundedRect(ctx, headCx + ankHW + 1 * S, kneeY, ankHW * 2 + 2 * S, ankleY - kneeY, 4 * S)
	ctx.fill()

	ctx.fillStyle = PANTS
	ctx.beginPath()
	ctx.moveTo(headCx - hipHW * 0.85, crotchY)
	ctx.lineTo(headCx - hipHW * 0.95, crotchY)
	ctx.lineTo(headCx - ankHW - 6 * S, kneeY)
	ctx.lineTo(headCx - ankHW + 2 * S, kneeY)
	ctx.closePath()
	ctx.fill()

	ctx.beginPath()
	ctx.moveTo(headCx + hipHW * 0.85, crotchY)
	ctx.lineTo(headCx + hipHW * 0.95, crotchY)
	ctx.lineTo(headCx + ankHW + 6 * S, kneeY)
	ctx.lineTo(headCx + ankHW - 2 * S, kneeY)
	ctx.closePath()
	ctx.fill()

	ctx.fillStyle = PANTS
	ctx.beginPath()
	ctx.moveTo(headCx - hipHW, hipY)
	ctx.bezierCurveTo(headCx - hipHW - 3 * S, hipY + 8 * S, headCx - hipHW * 0.9 - 2 * S, crotchY, headCx - hipHW * 0.9, crotchY)
	ctx.lineTo(headCx + hipHW * 0.9, crotchY)
	ctx.bezierCurveTo(headCx + hipHW * 0.9 + 2 * S, crotchY, headCx + hipHW + 3 * S, hipY + 8 * S, headCx + hipHW, hipY)
	ctx.closePath()
	ctx.fill()

	drawArm(ctx, headCx - shHW + 2 * S, shY + 4 * S, leftArmAngle, armLen, armW, foreLen, foreW, S, state, now, 'left', stage)

	const torsoGrad = ctx.createLinearGradient(headCx - shHW, shY, headCx + shHW, shY)
	torsoGrad.addColorStop(0, SHIRT_HL)
	torsoGrad.addColorStop(0.45, SHIRT)
	torsoGrad.addColorStop(1, PANTS_SH)

	ctx.fillStyle = torsoGrad
	ctx.beginPath()
	ctx.moveTo(headCx - shHW, shY)
	ctx.bezierCurveTo(headCx - shHW - 4 * S, shY + 10 * S, headCx - waistHW - 2 * S, waistY - 10 * S, headCx - waistHW, waistY)
	ctx.lineTo(headCx - hipHW, hipY)
	ctx.lineTo(headCx + hipHW, hipY)
	ctx.lineTo(headCx + waistHW, waistY)
	ctx.bezierCurveTo(headCx + waistHW + 2 * S, waistY - 10 * S, headCx + shHW + 4 * S, shY + 10 * S, headCx + shHW, shY)
	ctx.closePath()
	ctx.fill()

	if (stage >= 3) {
		ctx.strokeStyle = 'rgba(255,255,255,0.08)'
		ctx.lineWidth   = 1 * S
		ctx.beginPath()
		ctx.roundRect
			? ctx.roundRect(headCx - 14 * S, shY + 10 * S, 14 * S, 10 * S, 2 * S)
			: roundedRect(ctx, headCx - 14 * S, shY + 10 * S, 14 * S, 10 * S, 2 * S)
		ctx.stroke()
	}

	drawArm(ctx, headCx + shHW - 2 * S, shY + 4 * S, rightArmAngle, armLen, armW, foreLen, foreW, S, state, now, 'right', stage)

	const skinGradV = ctx.createLinearGradient(headCx - neckW, 0, headCx + neckW, 0)
	skinGradV.addColorStop(0, SKIN_SH)
	skinGradV.addColorStop(0.4, SKIN)
	skinGradV.addColorStop(1, SKIN_SH)
	ctx.fillStyle = skinGradV
	ctx.fillRect(headCx - neckW / 2, neckT, neckW, neckB - neckT)

	ctx.strokeStyle = SHIRT_HL
	ctx.lineWidth = 2 * S
	ctx.lineCap = 'round'
	ctx.beginPath()
	ctx.moveTo(headCx - neckW * 0.8, neckB)
	ctx.lineTo(headCx, neckB + 7 * S)
	ctx.lineTo(headCx + neckW * 0.8, neckB)
	ctx.stroke()

	ctx.strokeStyle = HP_DARK
	ctx.lineWidth   = 4.5 * S
	ctx.lineCap     = 'round'
	ctx.beginPath()
	ctx.moveTo(headCx - headR - 2 * S, headCy - 4 * S)
	ctx.bezierCurveTo(
		headCx - headR + 1 * S, headCy - headR * 1.48,
		headCx + headR - 1 * S, headCy - headR * 1.48,
		headCx + headR + 2 * S, headCy - 4 * S
	)
	ctx.stroke()

	ctx.fillStyle = HAIR
	ctx.beginPath()
	ctx.arc(headCx, headCy, headR * 0.97, Math.PI + 0.22, -0.22, false)
	ctx.bezierCurveTo(headCx + headR * 0.7, headCy - headR * 0.4, headCx - headR * 0.7, headCy - headR * 0.4, headCx - headR * 0.97, headCy)
	ctx.closePath()
	ctx.fill()

	const headGrad = ctx.createRadialGradient(headCx - headR * 0.28, headCy - headR * 0.28, 1, headCx, headCy, headR)
	headGrad.addColorStop(0, SKIN_HL)
	headGrad.addColorStop(0.6, SKIN)
	headGrad.addColorStop(1, SKIN_SH)
	ctx.fillStyle = headGrad
	ctx.beginPath()
	ctx.arc(headCx, headCy, headR, 0, Math.PI * 2)
	ctx.fill()

	drawFace(ctx, headCx, headCy, headR, now, state, S)

	const hpPulse  = amplitude > 0.05 ? 0.5 + Math.sin(now / 180) * 0.5 : 0
	let hpColor    = HP
	if (state === 'listening')  hpColor = `rgba(245,158,11,${0.7 + hpPulse * 0.3})`
	else if (state === 'talking') hpColor = '#15803D'
	else if (state === 'thinking') hpColor = `rgba(245,158,11,${0.6 + Math.sin(now / 350) * 0.4})`

	const ecY = headCy - 4 * S
	const ecW = 5.5 * S
	const ecH = 8   * S

	ctx.fillStyle   = hpColor
	ctx.strokeStyle = HP_DARK
	ctx.lineWidth   = 0.8
	ctx.beginPath()
	ctx.ellipse(headCx - headR - 2 * S, ecY, ecW, ecH, -0.12, 0, Math.PI * 2)
	ctx.fill(); ctx.stroke()
	ctx.beginPath()
	ctx.ellipse(headCx + headR + 2 * S, ecY, ecW, ecH, 0.12, 0, Math.PI * 2)
	ctx.fill(); ctx.stroke()

	ctx.fillStyle = 'rgba(255,255,255,0.13)'
	ctx.beginPath()
	ctx.ellipse(headCx - headR - 2 * S, ecY - 1 * S, ecW * 0.5, ecH * 0.45, -0.12, 0, Math.PI * 2)
	ctx.fill()
	ctx.beginPath()
	ctx.ellipse(headCx + headR + 2 * S, ecY - 1 * S, ecW * 0.5, ecH * 0.45, 0.12, 0, Math.PI * 2)
	ctx.fill()

	if (stage >= 2) {
		ctx.strokeStyle = HP_DARK
		ctx.lineWidth   = 2.2 * S
		ctx.lineCap     = 'round'
		const bx = headCx + headR + ecW + 2 * S
		const by = ecY + ecH * 0.5
		ctx.beginPath()
		ctx.moveTo(bx, by)
		ctx.quadraticCurveTo(bx + 8 * S, by + 4 * S, bx + 7 * S, by + 13 * S)
		ctx.stroke()
		ctx.fillStyle = HP
		ctx.beginPath()
		ctx.arc(bx + 7 * S, by + 13 * S, 3 * S, 0, Math.PI * 2)
		ctx.fill()
	}

	if (state === 'thinking') {
		const dp = Math.floor(now / 480) % 3
		for (let i = 0; i < 3; i++) {
			ctx.fillStyle = i <= dp ? AMBER : '#475569'
			ctx.beginPath()
			ctx.arc(headCx + headR * 0.68 + i * 6 * S, headCy - headR * 1.08, 2.8 * S, 0, Math.PI * 2)
			ctx.fill()
		}
	}

	if (isAsleep) {
		ctx.textBaseline = 'middle'
		ctx.textAlign    = 'left'
		const zc = (now / 1500) % 3
		const zf = zc % 1
		ctx.font = `bold ${Math.round(10 * S)}px monospace`
		ctx.fillStyle = `rgba(148,163,184,${0.9 - zf * 0.6})`
		ctx.fillText('z', headCx + headR * 0.88 + Math.floor(zc) * 5 * S, headCy - headR * 0.3 - zf * 18 * S)
		ctx.font = `bold ${Math.round(7 * S)}px monospace`
		ctx.fillStyle = `rgba(148,163,184,${0.55 - zf * 0.35})`
		ctx.fillText('z', headCx + headR * 1.25 + Math.floor(zc) * 3 * S, headCy - headR * 0.72 - zf * 13 * S)
		ctx.textBaseline = 'alphabetic'
		ctx.textAlign    = 'start'
	}

	if (isCelebrate) {
		const colors = state === 'celebrating' ? [AMBER, GREEN, PURPLE, RED, '#3B82F6'] : [AMBER, '#FCD34D']
		if (Math.random() > 0.45) {
			const a = Math.random() * Math.PI * 2
			parts.push({
				x: headCx + Math.cos(a) * headR * 0.5,
				y: headCy + Math.sin(a) * headR * 0.5,
				vx: (Math.random() - 0.5) * 3,
				vy: -Math.random() * 3 - 0.5,
				life: 1,
				color: colors[Math.floor(Math.random() * colors.length)]
			})
		}
		for (let i = parts.length - 1; i >= 0; i--) {
			const p = parts[i]
			p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.022
			if (p.life <= 0) { parts.splice(i, 1); continue }
			ctx.beginPath()
			ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2)
			ctx.fillStyle = p.color + Math.floor(p.life * 220).toString(16).padStart(2, '0')
			ctx.fill()
		}
	} else {
		parts.length = 0
	}

	ctx.restore()

	const glowColors: Partial<Record<KitCharacterState, string>> = {
		listening: AMBER, thinking: AMBER, talking: GREEN,
		excited: AMBER, celebrating: PURPLE, concerned: RED
	}
	const gc = glowColors[state]
	if (gc) {
		const glowY = headCy + (H - headCy) * 0.4
		const glow  = ctx.createRadialGradient(headCx, glowY, 0, headCx, glowY, 55 * S)
		glow.addColorStop(0, gc + '22')
		glow.addColorStop(1, gc + '00')
		ctx.fillStyle = glow
		ctx.fillRect(0, 0, W, H)
	}
}

function drawArm(
	ctx: CanvasRenderingContext2D,
	pivotX: number, pivotY: number,
	angle: number,
	upperLen: number, upperW: number,
	foreLen: number, foreW: number,
	S: number,
	state: KitCharacterState,
	now: number,
	side: 'left' | 'right',
	stage: KitEvolutionStage
) {
	const sign = side === 'left' ? 1 : -1

	ctx.save()
	ctx.translate(pivotX, pivotY)
	ctx.rotate(sign * angle)

	const uGrad = ctx.createLinearGradient(-upperW * 0.5, 0, upperW * 0.5, 0)
	uGrad.addColorStop(0, SHIRT_HL)
	uGrad.addColorStop(0.5, SHIRT)
	uGrad.addColorStop(1, PANTS_SH)
	ctx.fillStyle = uGrad
	roundedRect(ctx, -upperW / 2, 0, upperW, upperLen, upperW / 2)
	ctx.fill()

	ctx.translate(0, upperLen)

	let elbowAngle = 0
	if (state === 'thinking' && side === 'right') elbowAngle = -1.0
	if (state === 'talking') elbowAngle = side === 'right' ? -0.3 + Math.sin(now / 300) * 0.2 : 0.05

	ctx.rotate(elbowAngle)

	const fGrad = ctx.createLinearGradient(-foreW * 0.5, 0, foreW * 0.5, 0)
	fGrad.addColorStop(0, SKIN_HL)
	fGrad.addColorStop(0.5, SKIN)
	fGrad.addColorStop(1, SKIN_SH)
	ctx.fillStyle = fGrad
	roundedRect(ctx, -foreW / 2, 0, foreW, foreLen, foreW / 2)
	ctx.fill()

	ctx.fillStyle = SKIN
	ctx.beginPath()
	ctx.arc(0, foreLen, foreW * 0.65, 0, Math.PI * 2)
	ctx.fill()

	if (stage >= 4 && side === 'right' && state !== 'sleeping' && !['excited', 'celebrating'].includes(state)) {
		ctx.fillStyle = '#1E293B'
		ctx.strokeStyle = '#3B82F6'
		ctx.lineWidth = 1.2 * S
		roundedRect(ctx, -12 * S, foreLen - 6 * S, 24 * S, 16 * S, 2 * S)
		ctx.fill(); ctx.stroke()
		ctx.fillStyle = '#0EA5E9'
		ctx.globalAlpha = 0.4
		roundedRect(ctx, -9 * S, foreLen - 4 * S, 18 * S, 10 * S, 1 * S)
		ctx.fill()
		ctx.globalAlpha = 1
	}

	ctx.restore()
}

function drawFace(
	ctx: CanvasRenderingContext2D,
	hx: number, hy: number, hR: number,
	now: number,
	state: KitCharacterState,
	S: number
) {
	const eyeY   = hy - 2   * S
	const eyeSp  = hR * 0.36
	const eyeR   = hR * 0.16
	const isSleep = state === 'sleeping'
	const blink   = !isSleep && Math.floor(now / 3400) % 3 === 0 && (now % 3400) < 110

	const eyeLX = (state === 'idle' || state === 'watching') ? -2.5 * S : 0
	const eyeLY = state === 'thinking' ? -2 * S : 0

	if (isSleep || blink) {
		ctx.strokeStyle = HAIR
		ctx.lineWidth = 1.6; ctx.lineCap = 'round'
		for (const sx of [-eyeSp, eyeSp]) {
			ctx.beginPath()
			ctx.arc(hx + sx + eyeLX, eyeY + eyeLY, eyeR * 0.72, 0.05, Math.PI - 0.05)
			ctx.stroke()
		}
	} else {
		ctx.fillStyle = '#fff'
		for (const sx of [-eyeSp, eyeSp]) {
			ctx.beginPath()
			ctx.arc(hx + sx + eyeLX, eyeY + eyeLY, eyeR, 0, Math.PI * 2)
			ctx.fill()
		}
		if (state === 'excited' || state === 'celebrating') {
			ctx.strokeStyle = AMBER; ctx.lineWidth = 1.7; ctx.lineCap = 'round'
			for (const sx of [-eyeSp, eyeSp]) {
				ctx.beginPath()
				ctx.arc(hx + sx + eyeLX, eyeY + eyeLY, eyeR * 0.75, 0, Math.PI)
				ctx.stroke()
			}
		} else {
			ctx.fillStyle = state === 'concerned' ? '#374151' : HAIR
			const pR = eyeR * (state === 'concerned' ? 0.72 : 0.60)
			for (const sx of [-eyeSp, eyeSp]) {
				ctx.beginPath()
				ctx.arc(hx + sx + eyeLX, eyeY + eyeLY, pR, 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.fillStyle = 'rgba(255,255,255,0.7)'
			for (const sx of [-eyeSp, eyeSp]) {
				ctx.beginPath()
				ctx.arc(hx + sx + eyeLX - pR * 0.38, eyeY + eyeLY - pR * 0.38, pR * 0.28, 0, Math.PI * 2)
				ctx.fill()
			}
		}
	}

	ctx.strokeStyle = HAIR; ctx.lineWidth = 1.6 * S; ctx.lineCap = 'round'
	const bY  = eyeY + eyeLY - eyeR * 1.65
	const bHW = eyeR * 1.18

	if (state === 'concerned') {
		ctx.beginPath()
		ctx.moveTo(hx - eyeSp + eyeLX - bHW, bY)
		ctx.lineTo(hx - eyeSp + eyeLX + bHW * 0.5, bY - 2.5 * S)
		ctx.stroke()
		ctx.beginPath()
		ctx.moveTo(hx + eyeSp + eyeLX - bHW * 0.5, bY - 2.5 * S)
		ctx.lineTo(hx + eyeSp + eyeLX + bHW, bY)
		ctx.stroke()
	} else {
		const lift = (state === 'excited' || state === 'celebrating') ? -2.5 * S : 0
		for (const sx of [-1, 1] as const) {
			ctx.beginPath()
			ctx.moveTo(hx + sx * eyeSp + eyeLX - bHW * 0.8, bY + lift)
			ctx.quadraticCurveTo(hx + sx * eyeSp + eyeLX, bY - S + lift, hx + sx * eyeSp + eyeLX + bHW * 0.8, bY + lift)
			ctx.stroke()
		}
	}

	const noseY = hy + 6 * S
	ctx.fillStyle = SKIN_SH
	ctx.beginPath()
	ctx.ellipse(hx + eyeLX * 0.3, noseY, 2.2 * S, 1.6 * S, 0, 0, Math.PI * 2)
	ctx.fill()

	const mY = hy + 11 * S
	ctx.strokeStyle = '#B06030'; ctx.lineWidth = 1.8 * S; ctx.lineCap = 'round'

	if (state === 'talking') {
		const open = Math.abs(Math.sin(now / 110)) * 4.5 * S
		ctx.fillStyle = HAIR
		ctx.beginPath()
		ctx.ellipse(hx + eyeLX * 0.2, mY + open * 0.25, 5.5 * S, 2.5 * S + open, 0, 0, Math.PI * 2)
		ctx.fill(); ctx.strokeStyle = '#B06030'; ctx.stroke()
	} else if (state === 'excited' || state === 'celebrating') {
		ctx.beginPath(); ctx.arc(hx, mY - 2 * S, 5.5 * S, 0, Math.PI); ctx.stroke()
	} else if (state === 'concerned') {
		ctx.beginPath(); ctx.arc(hx, mY + 4 * S, 4 * S, Math.PI, 0); ctx.stroke()
	} else if (isSleep) {
		ctx.beginPath(); ctx.moveTo(hx - 4 * S, mY); ctx.lineTo(hx + 4 * S, mY); ctx.stroke()
	} else {
		ctx.beginPath(); ctx.arc(hx, mY - S, 5 * S, 0.18, Math.PI - 0.18); ctx.stroke()
	}
}

function drawShoe(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number, S: number) {
	ctx.save()
	ctx.translate(x, y)
	ctx.rotate(tilt)
	const shoeGrad = ctx.createRadialGradient(2 * S, -2 * S, 1, 0, 0, 12 * S)
	shoeGrad.addColorStop(0, '#374151')
	shoeGrad.addColorStop(1, SHOES)
	ctx.fillStyle = shoeGrad
	ctx.beginPath()
	ctx.ellipse(2 * S, 0, 11 * S, 5.5 * S, 0, 0, Math.PI * 2)
	ctx.fill()
	ctx.fillStyle = 'rgba(255,255,255,0.07)'
	ctx.beginPath()
	ctx.ellipse(5 * S, -2 * S, 5 * S, 2.5 * S, -0.2, 0, Math.PI * 2)
	ctx.fill()
	ctx.restore()
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const R = Math.min(r, w / 2, h / 2)
	ctx.beginPath()
	ctx.moveTo(x + R, y)
	ctx.lineTo(x + w - R, y)
	ctx.quadraticCurveTo(x + w, y, x + w, y + R)
	ctx.lineTo(x + w, y + h - R)
	ctx.quadraticCurveTo(x + w, y + h, x + w - R, y + h)
	ctx.lineTo(x + R, y + h)
	ctx.quadraticCurveTo(x, y + h, x, y + h - R)
	ctx.lineTo(x, y + R)
	ctx.quadraticCurveTo(x, y, x + R, y)
	ctx.closePath()
}
