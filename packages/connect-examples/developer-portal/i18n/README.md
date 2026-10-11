# Developer portal localization

## Current delivery state

Only English and Simplified Chinese are published. The additional locale definitions and translation pipeline are preparation for French, German, Spanish and Japanese. Their full document translations have not been generated or reviewed. Do not enable these locales or describe this checkpoint as deployment-ready multilingual documentation.

`ui/` contains the source UI catalog and partial translated catalogs. `manifest.json` records the existing Chinese baseline without rewriting it. `catalogs/` stores reusable translated units; these are machine translation memory, not evidence of human review.

## Provider configuration

The repository owner must configure an OpenAI-compatible Chat Completions endpoint that accepts `response_format: json_object` and `max_completion_tokens`:

- Secret `DOCS_TRANSLATION_API_KEY`, accessible to this repository's Actions jobs.
- Variable `DOCS_TRANSLATION_BASE_URL`: an HTTPS base URL ending at the API version, without `/chat/completions`, credentials, query or fragment.
- Variable `DOCS_TRANSLATION_MODEL`: an explicitly selected model available through that service.
- Variable `DOCS_TRANSLATION_MAX_REQUESTS`: an explicit integer request cap per run, 1–2000. This limits logical batches, not currency. A batch can retry twice on HTTP 429/5xx. Configure the provider's own spending cap as well.
- Variable `DOCS_TRANSLATION_ENABLED=true` only after initial translation and acceptance are complete.

A Secret name is not a credential or confirmation that a repository can access it. No model, provider URL or billing authorization is assumed. Never put the API key in chat, source control or any `NEXT_PUBLIC_*` variable.

## Commands

From this package:

```sh
yarn i18n:extract-ui
yarn i18n:plan
# With provider configuration supplied securely in the process environment:
yarn i18n:sync
yarn i18n:check
yarn build
```

`i18n:plan` makes no API request. The default target set is Chinese, French, German, Spanish and Japanese. Unchanged Chinese pages retain their existing reviewed content. For the initial four-language fill, pass `--locales=fr,de,es,ja` to `scripts/i18n/sync.mjs`. A run resumes from saved successful batches. Initial planning currently requires 124 logical batches per new language (496 total), excluding retries and remaining custom-copy work; this is not a currency estimate. Model errors, missing units, altered placeholders, truncation and missing configuration fail closed.

A translated document is rendered from English by positional patches: executable code, imports, inline code, paths and structural metadata are not sent for translation. Original English heading anchors are added when headings change, and internal locale paths are rewritten. New prose is escaped before entering MDX; parsed structure is compared with the source to reject added code, expressions, links or formatting. A malformed batch stops generation and must be corrected before retrying. These checks do not prove semantic equivalence; review terminology, negation, conditions and security guidance.

Manual changes in target files stop automatic replacement. Unrecorded existing files are never overwritten. Deletion conflicts are checked before calling the provider; a write-ahead journal permits interrupted file/manifest updates to resume, while still rejecting intervening human edits. Apply a correction to the translation-memory entry and regenerate in a reviewed change, or explicitly review and update the target's manifest entry; never silently refresh hashes to hide differences.

## Synchronization and publication

The workflow runs only on trusted `onekey` code after relevant source changes or a manual dispatch. It executes only the reviewed `onekey` checkout, translates changed units, validates, builds, and then creates a unique `docs/automated-translations-*` branch and draft PR. While a previous translation PR is open it waits; merging that PR triggers a fresh check through the manifest path. Closing it without merging requires manual dispatch. It never checks out a pending translation branch or force pushes. It neither merges nor deploys. Failed runs upload completed translation batches for recovery, without credentials.

UI extraction updates only the English source catalog, never Chinese or other target catalogs. English changes may temporarily make the translation manifest stale. The production build must remain blocked until the translation update is reviewed and merged. Do not remove this check to publish stale translations. If required PR checks prevent a source-only merge, generate translations on the source branch before merging; the post-merge workflow is a backstop. This dependency must be verified against repository branch rules before enabling the workflow. Page deletion also requires an explicit update to the historical review ledger and GitBook migration destinations; automation must not erase that audit trail.

Before adding a language to `publishedLocaleCodes`, complete all 317 pages, 32 navigation files, UI strings and dynamic/custom page copy. Verify translated release data, metadata and embedded JSX expressions as well as ordinary Markdown. The current UI extraction deliberately covers explicit `ui()` calls and known bilingual dictionaries; it is not a claim that every remaining hard-coded string has been migrated.

Acceptance must include six-language production export and Pagefind indexes, original EN/ZH routes and anchors, localized internal links, locale-preserving navigation, keyboard controls, simulator Mock paths, desktop/mobile wrapping, Roobert/asset loading, and independent technical/linguistic review. Send the deployment handoff only after those checks and the relevant CI results pass.
