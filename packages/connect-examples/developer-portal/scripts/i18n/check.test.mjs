import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateTranslation, checkLocales } from './check.mjs';
import { recordTranslations } from './record.mjs';

test('offline validation rejects changed code, destinations, anchors, and placeholders', () => {
  const source = '# Read the guide\n\nUse `evmGetAddress`. [Guide](/en/guide).\n';
  const target =
    '<span id="read-the-guide" />\n\n# Lire le guide\n\nUtilisez `evmGetAddress`. [Guide](/fr/guide).\n';
  assert.deepEqual(validateTranslation(source, target, 'guide.mdx', 'fr'), []);
  assert.ok(
    validateTranslation(
      source,
      target.replace('evmGetAddress', 'evmSignTransaction'),
      'guide.mdx',
      'fr'
    ).some(x => x.includes('Code examples'))
  );
  assert.ok(
    validateTranslation(
      source,
      target.replace('/fr/guide', 'https://bad.invalid'),
      'guide.mdx',
      'fr'
    ).some(x => x.includes('Links'))
  );
  assert.ok(
    validateTranslation(
      source,
      target.replace('read-the-guide', 'missing'),
      'guide.mdx',
      'fr'
    ).some(x => x.includes('anchor'))
  );
  assert.ok(
    validateTranslation(
      '{"Count":"Results: {count}"}',
      '{"Count":"Résultats"}',
      '_ui.json',
      'fr'
    ).some(x => x.includes('placeholders'))
  );
});

test('translated grammar can reorder inline literals but cannot add, remove, or change them', () => {
  const source = 'Pass `true` to `connect()`.\n';
  const target = 'Appelez `connect()` avec `true`.\n';
  assert.deepEqual(validateTranslation(source, target, 'guide.mdx', 'fr'), []);
  assert.ok(
    validateTranslation(source, target + '`true`', 'guide.mdx', 'fr').some(x =>
      x.includes('Code examples')
    )
  );
  assert.ok(
    validateTranslation(source, target.replace('`true`', '`false`'), 'guide.mdx', 'fr').some(x =>
      x.includes('Code examples')
    )
  );
});

test('English-only edits fail until the exact translated files are reviewed and recorded', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-offline-i18n-'));
  try {
    for (const d of ['content/en', 'content/fr', 'i18n/ui'])
      await mkdir(join(root, d), { recursive: true });
    await writeFile(join(root, 'content/en/a.mdx'), 'Read the guide.\n');
    await writeFile(join(root, 'content/fr/a.mdx'), 'Lisez le guide.\n');
    await writeFile(join(root, 'i18n/ui/en.json'), '{"Search":"Search"}');
    await writeFile(join(root, 'i18n/ui/fr.json'), '{"Search":"Rechercher"}');
    await writeFile(join(root, 'i18n/manifest.json'), '{"version":2,"locales":{}}');
    assert.ok((await checkLocales({ root, locales: ['fr'] })).length);
    await recordTranslations({ root, locale: 'fr', paths: ['a.mdx', '_ui.json'] });
    assert.deepEqual(await checkLocales({ root, locales: ['fr'] }), []);
    await mkdir(join(root, 'components'));
    await writeFile(join(root, 'components/Button.jsx'), "ui(locale, 'New button')");
    assert.ok(
      (await checkLocales({ root, locales: ['fr'] })).some(x =>
        x.includes('Uncatalogued UI message: New button')
      )
    );
    await rm(join(root, 'components/Button.jsx'));
    await writeFile(join(root, 'content/en/a.mdx'), 'Confirm the address.\n');
    assert.ok(
      (await checkLocales({ root, locales: ['fr'] })).some(x => x.includes('English changed'))
    );
    await writeFile(join(root, 'content/fr/a.mdx'), 'Confirmez l’adresse.\n');
    await recordTranslations({ root, locale: 'fr', paths: ['a.mdx'] });
    assert.deepEqual(await checkLocales({ root, locales: ['fr'] }), []);
    const before = await readFile(join(root, 'i18n/manifest.json'), 'utf8');
    await assert.rejects(
      recordTranslations({ root, locale: 'fr', paths: ['missing.mdx'] }),
      /Unknown/
    );
    assert.equal(await readFile(join(root, 'i18n/manifest.json'), 'utf8'), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('navigation translation preserves slugs, behavior, imports and code while allowing labels', () => {
  const source =
    "import Icon from '../../icon.js'; export default {intro: {title: 'Start here', display: 'hidden', href: '/en/intro'}};";
  const target =
    "import Icon from '../../icon.js'; export default {intro: {title: 'はじめに', display: 'hidden', href: '/ja/intro'}};";
  assert.deepEqual(validateTranslation(source, target, '_meta.js', 'ja'), []);
  for (const modified of [
    target.replace('intro:', 'removed:'),
    target.replace("'hidden'", "'normal'"),
    target.replace('../../icon.js', '../../other.js'),
    target.replace('export default', 'alert(1); export default'),
  ]) {
    assert.ok(
      validateTranslation(source, modified, '_meta.js', 'ja').some(x =>
        x.includes('Navigation structure')
      )
    );
  }
});

test('manual MDX translations preserve imports, expressions and component behavior', () => {
  const source =
    'import Demo from \'./Demo.jsx\'\n\n<Demo command="getAddress" locale="en" title="Connect" />\n\n<Tabs items={[\'Success\', \'Error\']} />\n\n{enabled && <Demo />}\n';
  const target = source
    .replace('locale="en"', 'locale="fr"')
    .replace('title="Connect"', 'title="Connecter"')
    .replace("['Success', 'Error']", "['Réussite', 'Erreur']");
  assert.deepEqual(validateTranslation(source, target, 'guide.mdx', 'fr'), []);
  for (const modified of [
    target.replace('./Demo.jsx', './Other.jsx'),
    target.replace('getAddress', 'wipeDevice'),
    target.replace('enabled &&', 'true &&'),
    target.replace('locale="fr"', 'locale="de"'),
    target.replace('locale="fr"', 'locale="en"'),
    target + '\nexport const run = fetch("https://bad.invalid");\n',
  ]) {
    assert.ok(
      validateTranslation(source, modified, 'guide.mdx', 'fr').some(x => x.includes('MDX runtime'))
    );
  }
});

test('JSX navigation is required and guards the custom sidebar locale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onekey-jsx-i18n-'));
  try {
    for (const d of ['content/en', 'content/fr', 'i18n/ui'])
      await mkdir(join(root, d), { recursive: true });
    const source = 'export default { index: "Overview", sidebar: {title: <Sidebar lang="en" />}}';
    const target = 'export default { index: "Aperçu", sidebar: {title: <Sidebar lang="fr" />}}';
    await writeFile(join(root, 'content/en/_meta.jsx'), source);
    for (const lang of ['en', 'fr']) await writeFile(join(root, `i18n/ui/${lang}.json`), '{}');
    await writeFile(join(root, 'i18n/manifest.json'), '{"version":2,"locales":{}}');
    assert.ok(
      (await checkLocales({ root, locales: ['fr'] })).some(x =>
        x.includes('Missing translation: fr/_meta.jsx')
      )
    );
    await writeFile(join(root, 'content/fr/_meta.jsx'), target);
    await recordTranslations({ root, locale: 'fr', paths: ['_meta.jsx', '_ui.json'] });
    assert.deepEqual(await checkLocales({ root, locales: ['fr'] }), []);
    assert.ok(
      validateTranslation(source, target.replace('lang="fr"', 'lang="en"'), '_meta.jsx', 'fr').some(
        x => x.includes('Navigation structure')
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
