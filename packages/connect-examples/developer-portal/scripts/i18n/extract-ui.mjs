import { parse } from '@babel/parser';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portalRoot } from './sync.mjs';

const keyOf = property => property.key?.name ?? property.key?.value;
const properties = node => Object.fromEntries((node?.properties || []).filter(p => p.type === 'ObjectProperty').map(p => [keyOf(p), p.value]));
export async function extractUI(root = portalRoot) {
  const en = JSON.parse(await readFile(join(root, 'i18n/ui/en.json'), 'utf8'));
  const add = (english, chinese) => {
    if (typeof english !== 'string' || !/[A-Za-z]/.test(english) || /[\u3400-\u9fff]/.test(english) || /^(https?:|\/|npx |npm |yarn |@)/.test(english)) return;
    en[english] = english;
  };
  const pairs = (english, chinese) => {
    if (english?.type === 'StringLiteral') add(english.value, chinese?.value);
    else if (english?.type === 'ObjectExpression') {
      const chineseProps = properties(chinese);
      for (const [key, value] of Object.entries(properties(english))) if (!['href','src','url','type','id','command','code'].includes(key)) pairs(value, chineseProps[key]);
    } else if (english?.type === 'ArrayExpression') english.elements.forEach((item, index) => pairs(item, chinese?.elements?.[index]));
  };
  for (const directory of ['app','components']) for (const file of await readdir(join(root, directory), { recursive: true })) {
    if (!/\.(jsx|js|mjs)$/.test(file)) continue;
    const ast = parse(await readFile(join(root, directory, file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    const declarations = new Map();
    const walk = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'CallExpression' && node.callee.name === 'ui' && node.arguments[1]?.type === 'StringLiteral') add(node.arguments[1].value, node.arguments[2]?.value);
      if (node.type === 'ObjectExpression') { const props = properties(node); if (props.en) pairs(props.en, props.zh); }
      if (node.type === 'VariableDeclarator' && node.id?.name) declarations.set(node.id.name, node.init);
      if (node.type === 'VariableDeclarator' && node.id?.name === 'getWidgetCopy') {
        const statements=node.init.body.body;
        pairs(statements.find(x=>x.type==='ReturnStatement')?.argument, statements.find(x=>x.type==='IfStatement')?.consequent.body.find(x=>x.type==='ReturnStatement')?.argument);
      }
      for (const [key,value] of Object.entries(node)) {
        if (['loc','start','end','extra','comments'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
      }
    };
    walk(ast);
    if (declarations.has('PRO_I18N_EN')) pairs(declarations.get('PRO_I18N_EN'), declarations.get('PRO_I18N_ZH'));
  }
  await writeFile(join(root, 'i18n/ui/en.json'), `${JSON.stringify(en, null, 2)}\n`);
  return Object.keys(en).length;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(`UI: collected ${await extractUI()} English messages`);
