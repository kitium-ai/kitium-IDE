// Kitium — Kit Companion floating overlay contribution

import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { toDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { mountKitCompanion } from './react/out/kit-companion-tsx/index.js';
import { VOID_OPEN_SIDEBAR_ACTION_ID } from '../../void/browser/sidebarPane.js';

class KitiumCompanionContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.kitiumCompanion';

	constructor(
		@ICommandService private readonly commandService: ICommandService,
	) {
		super();

		// Create a full-screen pointer-events-none overlay to host the companion
		const overlay = document.createElement('div');
		overlay.style.cssText = [
			'position:fixed',
			'inset:0',
			'pointer-events:none',
			'z-index:9998',
			'overflow:hidden',
		].join(';');
		document.body.appendChild(overlay);

		const { dispose } = mountKitCompanion(
			overlay,
			// onOpenChat: open Void sidebar
			() => { this.commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID); },
			// onExecuteCommand: send text to active terminal
			(cmd: string) => {
				this.commandService.executeCommand('workbench.action.terminal.sendSequence', { text: cmd + '\r' });
			},
		);
		this._register(toDisposable(dispose));

		this._register(toDisposable(() => {
			if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
		}));
	}
}

registerWorkbenchContribution2(
	KitiumCompanionContribution.ID,
	KitiumCompanionContribution,
	WorkbenchPhase.AfterRestored,
);
