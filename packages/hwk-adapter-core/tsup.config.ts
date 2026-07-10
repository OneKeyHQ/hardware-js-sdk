import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry as a map gives us full control over emitted file names — without
  // this, tsup preserves the `_subpath/` directory in `dist/`, so consumer
  // package.json `exports` would have to reference `./dist/_subpath/errors.mjs`,
  // leaking an internal implementation detail to anyone reading the export map.
  // The keys here are the dist basenames; values are the source files.
  entry: {
    index: 'src/index.ts',
    // Sub-export barrels — see ./src/_subpath/* for why each exists.
    //
    // Only `/errors` and `/ui-events` are exposed: they're the two surfaces
    // OneKey statically imports into its main bundle paths (HardwareErrorCode
    // in kit-bg vault helpers; UI_REQUEST / UI_RESPONSE in
    // ServiceThirdPartyHardware and ThirdPartyHardwareUiStateContainer).
    //
    // A `/types` sub-export was considered and rejected: every cross-package
    // type import on the consumer side is `import type {...}`, which the TS
    // compiler erases at runtime — sub-exporting type-only surfaces adds
    // public API to maintain for zero bundle benefit.
    errors: 'src/_subpath/errors.ts',
    'ui-events': 'src/_subpath/ui-events.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Required: keeps shared modules (constants, types, helpers re-exported
  // from both `index` and the sub-paths) in one chunk so consumers that
  // import via multiple paths don't get duplicated runtime values.
  splitting: true,
});
