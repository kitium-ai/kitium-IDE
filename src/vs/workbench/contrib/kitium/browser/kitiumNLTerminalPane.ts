// Kitium — NL Terminal panel ViewPane

import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	Extensions as ViewContainerExtensions, IViewContainersRegistry,
	ViewContainerLocation, IViewsRegistry, Extensions as ViewExtensions,
	IViewDescriptorService,
} from '../../../common/views.js';
import * as nls from '../../../../nls.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Orientation } from '../../../../base/browser/ui/sash/sash.js';
import { mountNLTerminal } from './react/out/nl-terminal-tsx/index.js';

export const KITIUM_NL_TERMINAL_VIEW_ID = 'workbench.view.kitium.nlTerminal';

class KitiumNLTerminalPane extends ViewPane {
	constructor(
		options: IViewPaneOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IOpenerService openerService: IOpenerService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IHoverService hoverService: IHoverService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(parent: HTMLElement): void {
		super.renderBody(parent);
		parent.style.overflow = 'hidden';

		const { dispose } = mountNLTerminal(
			parent,
			(cmd: string) => {
				// Send to active terminal
				this.commandService.executeCommand('workbench.action.terminal.sendSequence', { text: cmd + '\r' });
				// Reveal the terminal so the user sees the output
				this.commandService.executeCommand('workbench.action.terminal.focus');
			},
		);
		this._register(toDisposable(dispose));
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		this.element.style.height = `${height}px`;
		this.element.style.width = `${width}px`;
	}
}

// ── Register container in Panel (bottom bar) ──────────────────────────────────

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer(
	{
		id: KITIUM_NL_TERMINAL_VIEW_ID,
		title: nls.localize2('kitiumNLTerminal', 'NL Terminal'),
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [KITIUM_NL_TERMINAL_VIEW_ID, {
			mergeViewWithContainerWhenSingleView: true,
			orientation: Orientation.HORIZONTAL,
		}]),
		hideIfEmpty: false,
		order: 5,
		rejectAddedViews: true,
		icon: Codicon.symbolEvent,
	},
	ViewContainerLocation.Panel,
	{ doNotRegisterOpenCommand: false, isDefault: false },
);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
	id: KITIUM_NL_TERMINAL_VIEW_ID,
	hideByDefault: false,
	name: nls.localize2('kitiumNLTerminalView', 'NL Terminal'),
	ctorDescriptor: new SyncDescriptor(KitiumNLTerminalPane),
	canToggleVisibility: true,
	canMoveView: true,
	weight: 40,
	order: 1,
}], container);
