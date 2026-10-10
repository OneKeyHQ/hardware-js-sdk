import { createIndex, close } from 'pagefind';
import { publishedLocaleCodes } from '../i18n/locales.mjs';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

// Include example code while leaving ignored navigation and controls out of search.
const staging = await mkdtemp(join(tmpdir(), 'onekey-docs-search-'));
try {
  for (const language of publishedLocaleCodes) {
    const source = `out/${language}`;
    const directory = join(staging, language);
    for (const file of await readdir(source, { recursive: true })) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(join(source, file), 'utf8');
      const content = html.replace(/<div\b[^>]*>/g, tag =>
        /class="[^"]*\bnextra-code\b[^"]*"/.test(tag)
          ? tag.replace(/\sdata-pagefind-ignore="all"/, '')
          : tag
      );
      const target = join(directory, file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    const created = await createIndex({ forceLanguage: language });
    if (created.errors.length || !created.index) throw new Error(created.errors.join('\n'));
    const { index } = created;
    const added = await index.addDirectory({ path: directory });
    if (added.errors.length || !added.page_count) throw new Error(added.errors.join('\n') || `No ${language} pages indexed`);
    const written = await index.writeFiles({ outputPath: `out/_pagefind/${language}` });
    if (written.errors.length) throw new Error(written.errors.join('\n'));
    console.log(`Search: indexed ${added.page_count} ${language} pages, including code examples`);
    await index.deleteIndex();
  }
} finally {
  await close();
  await rm(staging, { recursive: true, force: true });
}
