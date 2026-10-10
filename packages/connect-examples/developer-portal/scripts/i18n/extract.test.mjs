import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocument, renderDocument, protectText, restoreText } from './extract.mjs';

const source = '---\ntitle: Getting started\n---\n\nimport { Card } from "./Card"\n\n# Connect a device\n\nRequest **one signature** with `evmSignTransaction`. [Read more](/en/guide#params).\n\n```js\nconst x = "Do not translate";\n```\n\n<Card title="Next steps" href="/en/guide" locale="en">Verify the address.</Card>\n';
const catalogFor = (document, map) => Object.fromEntries(document.units.map(unit => [unit.id, map[unit.text] || unit.text]));

test('translates prose and labels while preserving executable content, links and anchors', () => {
  const doc = extractDocument(source, 'guide.mdx');
  const output = renderDocument(doc, catalogFor(doc, { 'Getting started': 'Premiers pas', 'Connect a device': 'Connecter un appareil', 'Next steps': 'Étapes suivantes', 'Verify the address.': 'Vérifiez l’adresse.' }), 'fr');
  assert.match(output, /title: "Premiers pas"/);
  assert.match(output, /id="connect-a-device"/);
  assert.match(output, /# Connecter un appareil/);
  assert.match(output, /title="Étapes suivantes"/);
  assert.match(output, /href="\/fr\/guide" locale="fr"/);
  assert.match(output, /\[Read more\]\(\/fr\/guide#params\)/);
  assert.ok(output.includes('const x = "Do not translate";'));
  assert.ok(output.includes('import { Card } from "./Card"'));
  assert.ok(output.includes('`evmSignTransaction`'));
});

test('missing translations fail closed and headings with unchanged text need no duplicate anchor', () => {
  const doc = extractDocument('# API\n\n## Params\n\n## Params\n', 'a.mdx');
  assert.throws(() => renderDocument(doc, {}, 'de'), /Missing translation/);
  const output = renderDocument(doc, catalogFor(doc, {}), 'de');
  assert.equal(output, doc.source);
});

test('reserved tokens cannot be lost, duplicated or introduced by a model', () => {
  const p = protectText('Use OneKey Pro 2 with evmSignTransaction and 1000 ms.');
  assert.ok(!p.text.includes('evmSignTransaction'));
  assert.equal(restoreText(p.text, p.tokens), 'Use OneKey Pro 2 with evmSignTransaction and 1000 ms.');
  assert.throws(() => restoreText('Traduction', p.tokens), /placeholder/);
  assert.throws(() => restoreText(p.text + ' __OK_999__', p.tokens), /placeholder/);
});

test('translated prose cannot inject MDX executable syntax', () => {
  const doc = extractDocument('Read the guide.\n', 'a.mdx');
  const output = renderDocument(doc, catalogFor(doc, { 'Read the guide.': '<script>{run()}</script>' }), 'es');
  assert.ok(!output.includes('<script>'));
  assert.match(output, /&lt;script&gt;/);
  assert.match(output, /&#123;run\(\)&#125;/);
});

test('navigation metadata keeps slugs and technical properties, translates labels', () => {
  const doc = extractDocument("export default { guide: { title: 'Getting started', type: 'page', href: '/en/guide' }, faq: 'Common questions' }", '_meta.js');
  const output = renderDocument(doc, catalogFor(doc, { 'Getting started': 'Erste Schritte', 'Common questions': 'Häufige Fragen' }), 'de');
  assert.ok(output.includes('guide: { title: "Erste Schritte", type: \'page\''));
  assert.ok(output.includes('href: "/de/guide"'));
  assert.ok(output.includes('faq: "Häufige Fragen"'));
});

test('rejects model output that introduces ESM or new Markdown structure', () => {
  const doc = extractDocument('Read the guide.\n', 'a.mdx');
  assert.throws(() => renderDocument(doc, catalogFor(doc, { 'Read the guide.': 'export const injected = 1;' }), 'fr'), /structure/);
  assert.throws(() => renderDocument(doc, catalogFor(doc, { 'Read the guide.': '# Injected heading' }), 'fr'), /structure/);
});

test('Markdown text inside MDX JSX cannot introduce links', () => {
  const doc = extractDocument('<Callout>Read the guide.</Callout>\n', 'a.mdx');
  assert.throws(() => renderDocument(doc, catalogFor(doc, { 'Read the guide.': 'Verify [wallet](https://example.invalid/phishing).' }), 'fr'), /structure/);
  const output = renderDocument(doc, catalogFor(doc, { 'Read the guide.': 'Verify [wallet](/phishing).' }), 'fr');
  assert.ok(output.includes('\\[wallet\\]'));
});
