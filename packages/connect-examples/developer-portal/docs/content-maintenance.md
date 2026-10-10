# Maintaining developer documentation

The main portal repository is the publishing source. GitBook #229 is recorded in `gitbook-migration.json` against immutable source revision `e0c478d44297c73dfbf1fc888d15c94fc3bf9e9b`; it does not automatically publish here. Each of the 227 edited source documents has an English and Chinese destination. Legacy Bridge, firmware and Aptos WalletConnect APIs are identified as historical references, with original examples linked at that revision.

## Updating a page

1. Edit `content/en/<path>.mdx` and its Chinese counterpart. Check the current SDK type and implementation before changing API claims. Do not infer support from device model alone.
2. Review translated prose, code examples, parameters, return values, error handling and warnings. Keep existing filenames and fragment IDs; add a local `<span id="old-heading" />` when a heading changes.
3. Record only the pairs actually reviewed:

   ```sh
   node scripts/record-content-review.mjs hardware-sdk/getting-started.mdx
   ```

4. Run `yarn check:content` and `yarn build` in this package. The build validates bilingual file parity, review hashes and GitBook destination integrity before Next.js compilation and Pagefind indexing. Check rendered links and responsive UI when headings or components change.
5. Commit both languages and the corresponding `docs/content-review.json` and `i18n/manifest.json` entries together. The review command records the Chinese baseline in both ledgers. For a removed page, also remove its manifest entry and repair its links and migration destinations.

The manifest catches unreviewed drift; it cannot assess translation or API correctness. Recording a hash is a reviewer assertion, not an automated quality check. An OpenAI-compatible incremental translation pipeline is implemented but remains disabled pending provider configuration and initial acceptance. See [localization setup](../i18n/README.md). Generated EN/ZH pairs are accepted only when source and output match their recorded generated hashes; those hashes do not certify a human review. New languages should not be advertised until their content and navigation have been reviewed.

Generated release entries come from `data/hardware-sdk-releases.json`; its bilingual values must be checked separately when running `sync:changelog`. Metadata navigation labels and shared component copy also need human review because the historical review ledger covers MDX bodies only; the localization manifest also tracks navigation and extracted UI catalogs.

## Preserved functionality

The portal remains a static Next.js/Nextra site with the existing multilingual routes, chain navigation, simulator, local Pagefind search, AI gateway and Agent Wallet pages. The document toolbar uses the active page's copy/TOC settings, supports keyboard dismissal and reports clipboard failures. AI service links open only after the reader chooses them. Interactive playground and changelog layouts retain their own component styles.

## Verification limits

Documentation checks and mock/codec examples do not demonstrate hardware acceptance, signing validity or broadcast success. The XRP public declaration currently disagrees with its runtime transaction shape; the reference documents this mismatch explicitly. Bridge and WalletConnect v1 material is historical, not a recommendation for new integrations.
