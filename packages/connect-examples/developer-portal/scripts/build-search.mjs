import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publishedLocaleCodes } from '../i18n/locales.mjs';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const pagefindCli = fileURLToPath(new URL('runner/bin.cjs', import.meta.resolve('pagefind')));

// Include example code while leaving ignored navigation and controls out of search.
const staging = await mkdtemp(join(tmpdir(), 'onekey-docs-search-'));
try {
  for (const language of publishedLocaleCodes) {
    const source = `out/${language}`;
    const directory = join(staging, language);
    for (const file of await readdir(source, { recursive: true })) {
      if (!file.endsWith('.html')) continue;
      const original = await readFile(join(source, file), 'utf8');
      const html = original.replace(/(<html\b[^>]*\blang=")[^"]*(")/, `$1${language}$2`);
      if (html !== original) await writeFile(join(source, file), html);
      const content = html.replace(/<div\b[^>]*>/g, tag =>
        /class="[^"]*\bnextra-code\b[^"]*"/.test(tag)
          ? tag.replace(/\sdata-pagefind-ignore="all"/, '')
          : tag
      );
      const target = join(directory, file);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    // The CLI exposes punctuation settings that Pagefind 1.4's Node API omits.
    // Preserve underscores so API constants do not degrade into broad keyword matches.
    execFileSync(
      process.execPath,
      [
        pagefindCli,
        '--site',
        directory,
        '--force-language',
        language,
        '--include-characters',
        '_',
        '--output-path',
        `out/_pagefind/${language}`,
        '--quiet',
      ],
      { stdio: 'inherit' }
    );
    console.log(`Search: indexed ${language} pages, including code examples and API constants`);
  }
} finally {
  await rm(staging, { recursive: true, force: true });
}
