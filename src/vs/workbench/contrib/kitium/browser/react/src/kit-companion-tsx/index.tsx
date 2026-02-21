// Kitium — Kit Companion mount entry

import * as ReactDOM from 'react-dom/client'
import * as React from 'react'
import KitCompanion from './KitCompanion.js'

export function mountKitCompanion(
	rootElement: HTMLElement,
	onOpenChat: () => void,
	onExecuteCommand?: (cmd: string) => void,
): { dispose: () => void } {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		React.createElement(KitCompanion, { onOpenChat, onExecuteCommand })
	)
	return {
		dispose: () => root.unmount()
	}
}
