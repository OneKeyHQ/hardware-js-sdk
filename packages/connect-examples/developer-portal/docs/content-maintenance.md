# Maintaining developer documentation

The main portal repository is the publishing source. GitBook #229 is recorded in `gitbook-migration.json` against immutable source revision `e0c478d44297c73dfbf1fc888d15c94fc3bf9e9b`; it does not automatically publish here. Each of the 227 edited source documents has an English and Chinese destination. Legacy Bridge, firmware and Aptos WalletConnect APIs are identified as historical references, with original examples linked at that revision.

## Updating a page

1. Edit `content/en/<path>.mdx` and the matching files under `zh`, `fr`, `de`, `es` and `ja`. Check the current SDK type and implementation before changing API claims. Do not infer support from device model alone.
2. Review every translation in context, including conditions, negation, warnings, parameters and return values. Keep filenames, code examples and API literals unchanged. Preserve English heading anchors with Nextra’s `[#original-id]` syntax; a translated H1 can retain its original ID with a preceding `<span id="original-title" />`.
3. Record only the files actually reviewed. The historical English/Chinese ledger uses `node scripts/record-content-review.mjs <path>`. Record each reviewed French, German, Spanish and Japanese file with `yarn i18n:record <locale> <path>`. See [the localization workflow](../i18n/README.md) for navigation and UI changes.
4. Run `yarn check:content`, `yarn i18n:check` and `yarn build`. These checks validate historical GitBook destinations, all published language files, source/output fingerprints, code, links, heading anchors and UI placeholders before compilation and language-specific Pagefind indexing. Check rendered navigation, search, links and responsive UI for every affected language.
5. Commit English, all matching translations and the corresponding review records together. When removing a page, remove its manifest entries and repair incoming links and migration destinations.

A recorded fingerprint acknowledges a review; it does not prove translation or API correctness. All six editions are maintained directly by people or AI assistants, with no external translation API or Secret. The portal build runs on relevant pull requests and changes to `onekey`; missing or stale translations fail the build. That workflow produces an artifact and does not deploy it.

Release entries come from `data/hardware-sdk-releases.json` and `data/provider-releases.json`. Review their technical claims, run `yarn i18n:extract-ui`, and update all translated highlights. Navigation labels and shared component copy need contextual review too: the historical bilingual ledger covers MDX bodies, while `i18n/manifest.json` also tracks navigation and UI catalogs.

## Preserved functionality

The portal remains a static Next.js/Nextra site with the existing multilingual routes, chain navigation, simulator, local Pagefind search, AI gateway and Agent Wallet pages. The document toolbar uses the active page's copy/TOC settings, supports keyboard dismissal and reports clipboard failures. AI service links open only after the reader chooses them. Interactive playground and changelog layouts retain their own component styles.

## Verification limits

Documentation checks and mock/codec examples do not demonstrate hardware acceptance, signing validity or broadcast success. The XRP public declaration currently disagrees with its runtime transaction shape; the reference documents this mismatch explicitly. Bridge and WalletConnect v1 material is historical, not a recommendation for new integrations.
