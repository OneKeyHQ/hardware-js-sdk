import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { parse as parseJs } from '@babel/parser';
import { parseDocument as parseYaml } from 'yaml';
import GithubSlugger from 'github-slugger';
import { localizedPath } from '../../i18n/locales.mjs';

const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm).use(remarkMdx);
export const hash = value => createHash('sha256').update(value).digest('hex');
const proseProps = new Set([
  'title',
  'description',
  'label',
  'alt',
  'placeholder',
  'aria-label',
  'betaLabel',
  'question',
  'badge',
  'name',
]);
const technicalProps = new Set([
  'type',
  'display',
  'layout',
  'className',
  'class',
  'id',
  'key',
  'icon',
  'version',
  'date',
  'target',
  'rel',
  'role',
  'color',
  'style',
  'code',
  'command',
]);
const linkProps = new Set(['href', 'src', 'url', 'basePath']);
const textContent = node => node.value ?? (node.children || []).map(textContent).join('');
const isProse = value =>
  /[a-zA-Z]/.test(value) &&
  !/^(https?:|\/(?:\S|$)|#|@|\.{1,2}\/)/.test(value) &&
  !/^[\w.-]+\.(js|jsx|mjs|json|mdx|svg|png|webp)$/.test(value);

export function protectText(text) {
  const tokens = [];
  // Preserve identifiers, brands, URLs and numeric quantities before calling a model.
  const protectedText = text.replace(
    /\{[a-zA-Z][a-zA-Z0-9_]*\}|https?:\/\/[^\s)]+|OneKey(?: Pro 2| Pro| Classic 1S| Classic| Touch| Mini)?|\b(?:TypeScript|JavaScript|WebUSB|Bluetooth|BIP32|BIP39|EIP-\d+|ERC-\d+|PIN|SDK|API|USB|BLE|UTXO|PSBT|wei|satoshi)\b|\b[a-z]+[A-Z][a-zA-Z0-9]*\b|\b(?:0x[0-9a-fA-F]+|\d+(?:[.,]\d+)*)(?:%|\b)/g,
    token => {
      const placeholder = `__OK_${tokens.length}__`;
      tokens.push(token);
      return placeholder;
    }
  );
  return { text: protectedText, tokens };
}

export function restoreText(text, tokens) {
  const seen = [...text.matchAll(/__OK_(\d+)__/g)].map(match => Number(match[1]));
  if (
    seen.length !== tokens.length ||
    tokens.some((_, index) => seen.filter(value => value === index).length !== 1) ||
    seen.some(index => index >= tokens.length)
  ) {
    throw new Error('Translation changed a protected placeholder');
  }
  return text.replace(/__OK_(\d+)__/g, (_, index) => tokens[Number(index)]);
}

function escapeProse(value, jsx = false) {
  const safe = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
  return jsx ? safe : safe.replace(/[\\`*_[\]|]/g, '\\$&');
}

function walkJs(node, callback, parents = []) {
  if (!node || typeof node !== 'object') return;
  if (node.type) callback(node, parents);
  for (const [key, value] of Object.entries(node)) {
    if (
      [
        'loc',
        'start',
        'end',
        'extra',
        'comments',
        'tokens',
        'leadingComments',
        'trailingComments',
        'innerComments',
      ].includes(key)
    )
      continue;
    if (Array.isArray(value)) value.forEach(child => walkJs(child, callback, [...parents, node]));
    else if (value && typeof value === 'object') walkJs(value, callback, [...parents, node]);
  }
}

export function extractDocument(source, path) {
  const units = [];
  const links = [];
  const headings = [];
  const ranges = new Set();
  const add = (start, end, text, kind = 'text') => {
    const trimmed = text.trim();
    if (
      !trimmed ||
      !isProse(trimmed) ||
      /^(?:string|number|boolean|object|null|undefined|Buffer|Uint8Array)(?:\[\])?(?:\s*\|\s*(?:string|number|boolean|object|null|undefined)(?:\[\])?)*$/.test(
        trimmed
      )
    )
      return;
    const key = `${start}:${end}`;
    if (ranges.has(key)) return;
    ranges.add(key);
    units.push({
      id: hash(`${path}\0${kind}\0${trimmed}`),
      text: trimmed,
      start,
      end,
      kind,
      prefix: text.match(/^\s*/)[0],
      suffix: text.match(/\s*$/)[0],
    });
  };
  const extractJs = (code, offset = 0, metadata = false) => {
    const ast = parseJs(code, { sourceType: 'module', plugins: ['jsx'] });
    walkJs(ast, (node, parents) => {
      const parent = parents.at(-1);
      if (node.type === 'JSXText') add(offset + node.start, offset + node.end, node.value, 'jsx');
      if (node.type !== 'StringLiteral') return;
      if (parents.some(item => /Import|ExportAll/.test(item.type))) return;
      if (parent?.type === 'ObjectProperty' && parent.key === node) return;
      const property =
        parent?.type === 'ObjectProperty'
          ? parent.key.name || parent.key.value
          : parent?.type === 'JSXAttribute'
          ? parent.name.name
          : undefined;
      if (linkProps.has(property) && node.value.startsWith('/en')) {
        links.push({
          start: offset + node.start,
          end: offset + node.end,
          value: node.value,
          kind: 'json',
        });
        return;
      }
      if (['locale', 'lang'].includes(property) && node.value === 'en') {
        links.push({
          start: offset + node.start,
          end: offset + node.end,
          value: 'en',
          kind: 'locale-json',
        });
        return;
      }
      if (
        technicalProps.has(property) ||
        parents.some(
          item =>
            item.type === 'ObjectProperty' && technicalProps.has(item.key?.name || item.key?.value)
        )
      )
        return;
      const inChanges = parents.some(
        item => item.type === 'ObjectProperty' && (item.key?.name || item.key?.value) === 'changes'
      );
      if (
        proseProps.has(property) ||
        inChanges ||
        (metadata && parent?.type === 'ObjectProperty' && !linkProps.has(property))
      ) {
        add(offset + node.start, offset + node.end, node.value, 'json');
      }
    });
  };
  if (path.endsWith('.js') || path.endsWith('.jsx')) {
    extractJs(source, 0, /_meta\.jsx?$/.test(path));
  } else {
    const tree = parser.parse(source);
    const slugger = new GithubSlugger();
    const walk = (node, parents = []) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      const inCode = parents.some(parent =>
        ['code', 'pre', 'kbd', 'script', 'style'].includes(parent.name)
      );
      if (node.type === 'text' && !inCode) add(start, end, node.value, 'text');
      if (node.type === 'heading')
        headings.push({
          start,
          end,
          depth: node.depth,
          slug: (node.depth === 1 ? new GithubSlugger() : slugger).slug(textContent(node)),
        });
      if (['link', 'definition'].includes(node.type) && node.url.startsWith('/en')) {
        const raw = source.slice(start, end);
        const index = raw.lastIndexOf(node.url);
        if (index >= 0)
          links.push({
            start: start + index,
            end: start + index + node.url.length,
            value: node.url,
            kind: 'url',
          });
      }
      if (node.type === 'yaml') {
        const yamlStart = source.indexOf(node.value, start + 3);
        const doc = parseYaml(node.value);
        if (doc.errors.length) throw new Error(`Invalid frontmatter in ${path}`);
        for (const pair of doc.contents?.items || []) {
          if (
            ['title', 'description'].includes(pair.key?.value) &&
            typeof pair.value?.value === 'string'
          ) {
            add(
              yamlStart + pair.value.range[0],
              yamlStart + pair.value.range[1],
              pair.value.value,
              'json'
            );
          }
        }
      }
      if (node.type === 'mdxjsEsm') extractJs(node.value, start);
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        for (const attr of node.attributes || []) {
          if (typeof attr.value !== 'string') continue;
          const attrSource = source.slice(attr.position.start.offset, attr.position.end.offset);
          const valueStart = attr.position.start.offset + attrSource.indexOf('=') + 1;
          if (proseProps.has(attr.name))
            add(valueStart, attr.position.end.offset, attr.value, 'attribute');
          if (linkProps.has(attr.name) && attr.value.startsWith('/en'))
            links.push({
              start: valueStart,
              end: attr.position.end.offset,
              value: attr.value,
              kind: 'json',
            });
          if (attr.name === 'locale' && attr.value === 'en')
            links.push({
              start: valueStart,
              end: attr.position.end.offset,
              value: 'en',
              kind: 'locale-json',
            });
        }
      }
      for (const child of node.children || []) walk(child, [...parents, node]);
    };
    walk(tree);
  }
  return { source, path, sourceHash: hash(source), units, links, headings };
}

// Compare parsed structure, retaining URLs, code and expressions. Only prose values
// and safely quoted JS strings are allowed to differ from the trusted source.
function structure(value) {
  if (Array.isArray(value)) return value.map(structure);
  if (!value || typeof value !== 'object') return value;
  if (value.type === 'mdxjsEsm')
    return {
      type: value.type,
      program: structure(parseJs(value.value, { sourceType: 'module', plugins: ['jsx'] })),
    };
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (
      [
        'position',
        'loc',
        'start',
        'end',
        'extra',
        'data',
        'comments',
        'leadingComments',
        'trailingComments',
        'innerComments',
      ].includes(key)
    )
      continue;
    if (
      key === 'value' &&
      (['text', 'yaml', 'JSXText', 'StringLiteral'].includes(value.type) ||
        (value.type === 'mdxJsxAttribute' && typeof child === 'string'))
    )
      continue;
    result[key] = structure(child);
  }
  return result;
}

export function renderDocument(document, translations, locale) {
  const patches = document.units.map(unit => {
    const value = translations[unit.id];
    if (typeof value !== 'string' || !value.trim())
      throw new Error(`Missing translation: ${document.path} ${unit.id}`);
    let replacement;
    if (unit.kind === 'json') replacement = JSON.stringify(value);
    else if (unit.kind === 'attribute')
      replacement = JSON.stringify(
        value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
      );
    else
      replacement =
        unit.prefix +
        (value === unit.text
          ? document.source.slice(unit.start, unit.end).trim()
          : escapeProse(value.replace(/\s+/g, ' '), unit.kind === 'jsx')) +
        unit.suffix;
    return { ...unit, replacement };
  });
  for (const link of document.links) {
    const value = link.kind === 'locale-json' ? locale : localizedPath(link.value, locale);
    patches.push({ ...link, replacement: link.kind === 'url' ? value : JSON.stringify(value) });
  }
  const headingsChanged = document.headings.some(heading =>
    document.units.some(
      unit =>
        unit.start >= heading.start &&
        unit.end <= heading.end &&
        translations[unit.id] !== unit.text
    )
  );
  for (const heading of document.headings) {
    if (headingsChanged && heading.depth > 1) {
      // Nextra's explicit IDs keep each original target, including repeated headings.
      patches.push({ start: heading.end, end: heading.end, replacement: ` [#${heading.slug}]` });
    } else if (
      document.units.some(
        unit =>
          unit.start >= heading.start &&
          unit.end <= heading.end &&
          translations[unit.id] !== unit.text
      )
    ) {
      const marker = `id="${heading.slug}"`;
      if (!document.source.includes(marker))
        patches.push({
          start: heading.start,
          end: heading.start,
          replacement: `<span ${marker} />\n\n`,
        });
    }
  }
  patches.sort((a, b) => b.start - a.start || b.end - a.end);
  let output = document.source;
  let reference = document.source;
  let previous = output.length + 1;
  for (const patch of patches) {
    if (patch.end > previous) throw new Error(`Overlapping translation patches: ${document.path}`);
    output = output.slice(0, patch.start) + patch.replacement + output.slice(patch.end);
    reference =
      reference.slice(0, patch.start) +
      (patch.id ? document.source.slice(patch.start, patch.end) : patch.replacement) +
      reference.slice(patch.end);
    previous = patch.start;
  }
  // Reject invalid translated MDX/JS before any output is written.
  const parse = document.path.endsWith('.mdx')
    ? text => parser.parse(text)
    : text => parseJs(text, { sourceType: 'module', plugins: ['jsx'] });
  if (JSON.stringify(structure(parse(output))) !== JSON.stringify(structure(parse(reference))))
    throw Object.assign(new Error(`Translation changed document structure: ${document.path}`), {
      expected: structure(parse(reference)),
      actual: structure(parse(output)),
    });
  return output;
}

// Content invariants used by offline maintenance checks; no model service is involved.
export function inspectDocument(source, path) {
  const code = [],
    links = [],
    headings = [],
    anchors = [];
  const slugger = new GithubSlugger();
  const inspectJs = value =>
    walkJs(parseJs(value, { sourceType: 'module', plugins: ['jsx'] }), (node, parents) => {
      const parent = parents.at(-1);
      const property =
        parent?.type === 'ObjectProperty'
          ? parent.key.name || parent.key.value
          : parent?.type === 'JSXAttribute'
          ? parent.name.name
          : undefined;
      if (node.type === 'StringLiteral' && linkProps.has(property)) links.push(node.value);
    });
  if (/\.jsx?$/.test(path)) inspectJs(source);
  else {
    const walk = node => {
      if (node.type === 'code' || node.type === 'inlineCode')
        code.push({ type: node.type, lang: node.lang || '', value: node.value });
      if (['link', 'definition', 'image'].includes(node.type)) links.push(node.url);
      if (node.type === 'heading') {
        const text = textContent(node);
        const customId = text.match(/\s*\[#([^]+?)]\s*$/)?.[1];
        const slug = (node.depth === 1 ? new GithubSlugger() : slugger).slug(customId || text);
        headings.push(slug);
        anchors.push(slug);
      }
      if (node.type === 'mdxjsEsm') inspectJs(node.value);
      if (node.type?.startsWith('mdxJsx'))
        for (const attribute of node.attributes || []) {
          if (typeof attribute.value !== 'string') continue;
          if (linkProps.has(attribute.name)) links.push(attribute.value);
          if (attribute.name === 'id') anchors.push(attribute.value);
        }
      for (const child of node.children || []) walk(child);
    };
    walk(parser.parse(source));
  }
  return { code, links, headings, anchors };
}

// Navigation labels may change; slugs, imports and rendering behavior must not.
export function navigationSignature(source, locale = 'en') {
  const ast = parseJs(source, { sourceType: 'module', plugins: ['jsx'] });
  walkJs(ast, (node, parents) => {
    const parent = parents.at(-1);
    if (node.type === 'JSXText' && node.value.trim()) node.value = '<label>';
    if (node.type !== 'StringLiteral' || parent?.key === node) return;
    if (parents.some(item => /Import|ExportAll/.test(item.type))) return;
    const property =
      parent?.type === 'ObjectProperty'
        ? parent.key.name || parent.key.value
        : parent?.type === 'JSXAttribute'
        ? parent.name.name
        : undefined;
    if (linkProps.has(property)) {
      node.value = localizedPath(node.value, 'en');
      return;
    }
    if (['locale', 'lang'].includes(property) && node.value === locale) {
      node.value = '<locale>';
      return;
    }
    if (
      technicalProps.has(property) ||
      parents.some(
        item =>
          item.type === 'ObjectProperty' && technicalProps.has(item.key?.name || item.key?.value)
      )
    )
      return;
    if (proseProps.has(property) || parent?.type === 'ObjectProperty') node.value = '<label>';
  });
  const clean = value => {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            ![
              'loc',
              'start',
              'end',
              'extra',
              'comments',
              'tokens',
              'leadingComments',
              'trailingComments',
              'innerComments',
            ].includes(key)
        )
        .map(([key, child]) => [key, clean(child)])
    );
  };
  return clean(ast);
}

function cleanSyntax(value) {
  if (Array.isArray(value)) return value.map(cleanSyntax);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          ![
            'loc',
            'position',
            'start',
            'end',
            'extra',
            'data',
            'comments',
            'tokens',
            'leadingComments',
            'trailingComments',
            'innerComments',
          ].includes(key)
      )
      .map(([key, child]) => [key, cleanSyntax(child)])
  );
}

function runtimeJsSignature(source, locale, translatedLabels = false) {
  const ast = parseJs(source, { sourceType: 'module', plugins: ['jsx'] });
  const labelArray =
    translatedLabels && ast.program.body.length === 1 ? ast.program.body[0].expression : undefined;
  walkJs(ast, (node, parents) => {
    const parent = parents.at(-1);
    if (node.type === 'JSXText' && node.value.trim()) node.value = '<text>';
    if (node.type !== 'StringLiteral' || parent?.key === node) return;
    if (parents.some(item => /Import|ExportAll/.test(item.type))) return;
    const property =
      parent?.type === 'ObjectProperty'
        ? parent.key.name || parent.key.value
        : parent?.type === 'JSXAttribute'
        ? parent.name.name
        : undefined;
    if (linkProps.has(property)) node.value = localizedPath(node.value, 'en');
    else if (property === 'locale' && node.value === locale) node.value = '<locale>';
    else if (
      proseProps.has(property) ||
      (parent === labelArray && labelArray?.type === 'ArrayExpression')
    )
      node.value = '<text>';
  });
  return cleanSyntax(ast);
}

// Directly edited translations must preserve runtime behavior, not just code samples.
export function mdxRuntimeSignature(source, locale = 'en') {
  const modules = [],
    expressions = [],
    components = [];
  const walk = node => {
    if (node.type === 'mdxjsEsm') modules.push(runtimeJsSignature(node.value, locale));
    if (['mdxFlowExpression', 'mdxTextExpression'].includes(node.type))
      expressions.push(runtimeJsSignature(node.value, locale));
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) {
      const anchorOnly =
        node.name === 'span' &&
        !node.children?.length &&
        node.attributes?.length === 1 &&
        node.attributes[0].name === 'id';
      if (!anchorOnly) {
        const attributes = (node.attributes || []).map(attribute => {
          if (attribute.type === 'mdxJsxExpressionAttribute')
            return { spread: runtimeJsSignature(`({${attribute.value}})`, locale) };
          let value = attribute.value;
          if (typeof value === 'string') {
            if (linkProps.has(attribute.name)) value = localizedPath(value, 'en');
            else if (attribute.name === 'locale' && value === locale) value = '<locale>';
            else if (proseProps.has(attribute.name)) value = '<text>';
          } else if (value?.type === 'mdxJsxAttributeValueExpression') {
            value = runtimeJsSignature(
              value.value,
              locale,
              node.name === 'Tabs' && attribute.name === 'items'
            );
          }
          return { name: attribute.name, value };
        });
        components.push(JSON.stringify({ name: node.name, attributes }));
      }
    }
    for (const child of node.children || []) walk(child);
  };
  walk(parser.parse(source));
  return { modules, expressions, components: components.sort() };
}
