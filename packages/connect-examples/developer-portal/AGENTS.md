# Developer portal maintenance

This directory is the source for developer.onekey.so. Read `i18n/README.md` before editing documentation or shared copy. Repository-root AGENTS.md still applies.

- English under `content/en` is canonical. Update the same path in `zh`, `fr`, `de`, `es` and `ja` in the same change. Keep navigation `_meta.js` / `_meta.jsx` files aligned.
- Translations are plain MDX, not generated English fallbacks. Preserve technical meaning, warning conditions, API/property names, code, numbers, units and original heading anchors (Nextra `[#original-id]` syntax). Keep locale-prefixed links within the selected language.
- Shared text lives in `i18n/ui/<locale>.json` with readable English keys. Add component text through the `ui()` helper. Never introduce a binary English/Chinese branch for new shared UI.
- Keep rendering and interaction code in shared components. Do not duplicate page component implementations per locale. Code samples and product names can remain in English.
- Run `yarn i18n:extract-ui` after changing UI/release copy; fill all five target catalogs. `yarn i18n:plan` lists stale or missing translations without any API calls.
- Review and record only changed files with `yarn i18n:record <locale> <path>...`; `_ui.json` refers to a UI catalog. Do not refresh unrelated fingerprints or pretend hashes are linguistic review.
- Run `yarn i18n:check`, `yarn check:content` and `yarn build`. Test affected languages in desktop/mobile browsers, including search, links and language switching. Keep existing EN/ZH routes and anchors intact.
- No external translation service, Secret or scheduled AI job is needed. An AI assistant receiving this repository should maintain all language files directly.
- Do not perform real device actions, signing, broadcasting, firmware changes, deployment or Slack messaging as part of routine documentation edits without the user's authorization.
