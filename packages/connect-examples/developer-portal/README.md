# OneKey developer portal

This directory contains the Next.js/Nextra source for the developer portal. English and Chinese content lives in `content/en` and `content/zh`; `_meta.js` files define navigation. GitBook is a separate content source: editing or merging a GitBook change request does not rebuild this site.

## Develop and verify

Use Node.js 22 and the Yarn version declared in `package.json`.

```sh
yarn install
yarn dev
```

Create the complete static site and its locale-specific search indexes:

```sh
yarn build
```

Serve `out/` with a static HTTP server to test production behavior. Search depends on the generated `out/_pagefind/en` and `out/_pagefind/zh` directories, so it is not available until the production index is generated. The search build includes fenced code examples but excludes navigation and copy controls.

Before publishing, verify the build, local routes and heading anchors, mobile layout, keyboard navigation, and search for an API name and a symbol appearing only in a code example. Changes to signing examples also need source/type checks and the relevant device or wallet integration tests; a successful MDX build only proves the document renders.

## Maintain content

- Keep existing routes stable. Change labels in `_meta.js` without renaming files unless redirects are supplied.
- Use one clear page title, a purpose-specific description, prerequisites, a smallest useful example, result/error handling, and links to the next step.
- Check API names, parameters, return fields, units, and protocol restrictions against the matching SDK/provider source version. Separate source verification from physical-device and released-wallet verification.
- Identify illustrative placeholders and partial snippets. Never make a signing, broadcast, PIN change, or firmware operation look like a required setup step.
- Update the corresponding locale when changing a public contract. Record untranslated changes explicitly instead of treating a translated title as a full review.
- Reconcile any GitBook mirror deliberately, including internal page/file references and original slugs. GitBook has separate spaces and publication settings.

## Brand assets

Use the official SVGs in `public/brand` through `OneKeyLogo`. The green version is used in the header and favicon; the white version is used for assistant icons on dark backgrounds. Preserve the source artwork without recoloring or cropping. `public/icons/onekey.png` is a 256px raster export of the green SVG for Apple touch icons and PNG consumers.

Use Roobert for interface and editorial text, matching the main OneKey website. The 400, 500, and 600 WOFF2 faces in `public/fonts/Roobert` are loaded by `next/font/local` in the root layout with preloading and `font-display: swap`. Chinese glyphs use the system fallback stack, and code keeps Geist Mono. Font and product asset provenance is recorded beside the files.

The homepage uses the official Pro 2 artwork in `public/brand/pro2`. Its source and maintenance notes are recorded in that directory. Product imagery does not establish SDK or firmware compatibility; retain the version-specific support guidance in the documentation.

## Publication

The repository's `Build Developer Portal` GitHub Actions workflow builds and uploads an artifact. Its presence does not establish how `developer.onekey.so` is deployed. Confirm the actual hosting pipeline and environment before replacing the production site, then verify the live build, links, and search indexes after deployment.

## Integrated design

The homepage, Hardware SDK getting-started guide, and `evmSignTransaction` reference use the refreshed design in both English and Chinese. Their original URLs and heading anchors remain stable. `styles/portal-design.css` supplies shared brand tokens; detailed guide styles are scoped with `data-onekey-design`. Nextra still owns routing, page maps, search integration, accessible code tabs, copy controls, and document navigation. No Fumadocs dependency or `/docs/` routes are introduced.

Light mode is the default and readers can switch themes from the header or sidebar. The existing search/AI dialog and device simulator retain their interactions. Keep the chain selectors, Agent Wallet disclaimer, changelog synchronization, locale search indexes, base-path support, and static export pipeline when extending this design.
