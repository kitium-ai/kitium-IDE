import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		'./src/kit-companion-tsx/index.tsx',
		'./src/nl-terminal-tsx/index.tsx',
	],
	outDir: './out',
	format: ['esm'],
	splitting: false,
	clean: false,
	platform: 'browser',
	target: 'esnext',
	injectStyle: true,
	outExtension: () => ({ js: '.js' }),
	// Bundle all non-relative imports (react, react-dom, etc.)
	// Relative imports (like nl-terminal.js) are bundled automatically
	noExternal: [
		/^(?!\.).*$/
	],
	// No VS Code module externals needed — Kitium React components are self-contained
	treeshake: true,
	esbuildOptions(options) {
		options.outbase = 'src'
	}
})
