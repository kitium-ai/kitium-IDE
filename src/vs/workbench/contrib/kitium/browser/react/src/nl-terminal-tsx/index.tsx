// Kitium — NL Terminal mount entry

import * as ReactDOM from 'react-dom/client'
import * as React from 'react'
import NLTerminalCockpit from './NLTerminalCockpit.js'

export function mountNLTerminal(
	rootElement: HTMLElement,
	onExecute: (command: string) => void,
	packageManager?: 'npm' | 'pnpm' | 'yarn',
): { dispose: () => void } {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		React.createElement(NLTerminalCockpit, { onExecute, packageManager })
	)
	return {
		dispose: () => root.unmount()
	}
}
