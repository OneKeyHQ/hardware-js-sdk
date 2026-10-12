# Maintaining six-language documentation

English is the source of truth. Translations are ordinary, readable MDX files committed alongside it. There is no translation service, API key, background generation job or hidden English fallback for published documentation. An AI assistant or a person updates the related files together in one reviewed change.

## Where to edit

| Content | Location |
| --- | --- |
| English source | `content/en/<section>/<page>.mdx` |
| Chinese, French, German, Spanish, Japanese | The same relative path under `content/zh`, `fr`, `de`, `es`, `ja` |
| Navigation names and order | `_meta.js` / `_meta.jsx` in the matching content directory |
| Shared interface text | `i18n/ui/{en,zh,fr,de,es,ja}.json` |
| Language names, routes and publication | `i18n/locales.mjs` |
| Shared layouts and interactions | `components/`; do not duplicate components per language |
| Release versions, dates and highlights | `data/hardware-sdk-releases.json`, `data/provider-releases.json`; translated highlights are also UI catalog entries |
| Translation source/output fingerprints | `i18n/manifest.json`; maintained by the explicit review command below |
| Historical bilingual and GitBook audit | `docs/content-review.json`, `docs/gitbook-migration.json` |

UI catalog keys are the readable English source text, not opaque IDs. Keep the same keys in all six catalogs. Preserve `{count}`, `{command}` and other placeholders exactly. Known product names, API methods, package names, schema keys and code samples remain in their original form.

## Updating English and its translations

1. Read the English page and relevant SDK source before changing technical claims. Edit the English page first, then every corresponding translated page. Preserve conditions, negation, warnings, numeric limits and units; do not shorten a technical explanation into a summary.
2. Keep filenames, import paths, code fences and inline code identical. Rewrite only the language prefix of internal links. Preserve original English anchors with Nextra’s explicit heading syntax, for example `## Paramètres [#parameters]`. A translated page title may use `<span id="original-title" />` before its H1. This keeps repeated headings and existing cross-page fragments stable. Do not change other URL components.
3. For component copy, use `ui(locale, 'English source')` with a literal source key, or a known dictionary collected by the extractor. Run `yarn i18n:extract-ui`; translate every new key in the other five catalogs. Dynamic release highlights are collected from the release data files. Avoid hard-coded two-language branches.
4. Review the changed translated files in context. Record only the files actually reviewed, for example:

   ```sh
   yarn i18n:record fr hardware-sdk/getting-started.mdx
   yarn i18n:record de hardware-sdk/getting-started.mdx
   yarn i18n:record es hardware-sdk/getting-started.mdx
   yarn i18n:record ja hardware-sdk/getting-started.mdx
   # A UI-only review uses the logical path _ui.json:
   yarn i18n:record fr _ui.json
   ```

   For an English/Chinese MDX review, `node scripts/record-content-review.mjs <path>` records both the historical bilingual ledger and the Chinese localization baseline.
5. Run `yarn i18n:check`, `yarn check:content` and `yarn build`. `yarn i18n:plan` returns actionable missing/stale paths as JSON without making network requests. The build must fail if a published translation is missing, stale or changed without being recorded, or if UI keys/placeholders no longer match.
6. Check rendered navigation, links, desktop/mobile wrapping and language-specific search for every affected language. Commit source, translations, UI catalogs and updated review fingerprints together. Updating a fingerprint acknowledges your review; it does not prove linguistic accuracy.

When adding or removing a page, update all six language directories, each affected `_meta.js` / `_meta.jsx`, incoming links and the historical migration destinations. Remove obsolete manifest entries explicitly. Do not invent an English copy as a translated page, silently delete a manual translation, or refresh all fingerprints to conceal drift.

## Translation conventions

Use direct, natural developer documentation language. French uses clear imperatives; German uses consistent formal instructions; Spanish uses consistent second-person instructions; Japanese uses concise polite technical prose. Preserve OneKey branding and protocol/chain names. Translate explanations, navigation, tables, warnings, metadata and controls; English inside executable examples is intentional.

The document extractor/renderer in `scripts/i18n/extract.mjs` is an optional offline aid for bulk edits. Its structural checks reject added MDX code or links. Final MDX files are authoritative and can be edited directly; no translation memory database is needed to regenerate the website.

## Review boundaries

Structural checks do not certify API correctness, translation quality, hardware behavior, signing or broadcasting. Review technical meaning and security warnings independently. Deployment remains a separate action after source review, all-language acceptance and CI; no script here publishes the site.
