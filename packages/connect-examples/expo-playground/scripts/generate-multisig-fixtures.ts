import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { generateBtcFixtures } from './multisig/generateBtcFixtures';
import { generateEthFixtures } from './multisig/generateEthFixtures';
import { readMultisigMnemonics } from './multisig/readMnemonics';
import { renderMultisigFixtures } from './multisig/renderFixtures';

const OUTPUT_PATH = resolve(
  process.cwd(),
  'app/features/multisig/generatedFixtures.ts'
);

async function readExistingOutput(): Promise<string | undefined> {
  try {
    return await readFile(OUTPUT_PATH, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return undefined;
    throw error;
  }
}

async function writeAtomically(content: string): Promise<boolean> {
  if ((await readExistingOutput()) === content) return false;

  const temporaryPath = `${OUTPUT_PATH}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryPath, OUTPUT_PATH);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return true;
}

async function main(): Promise<void> {
  const mnemonics = readMultisigMnemonics(process.env);
  const [eth, btc] = await Promise.all([
    generateEthFixtures(mnemonics),
    generateBtcFixtures(mnemonics),
  ]);
  const content = renderMultisigFixtures({ version: 1, eth, btc }, mnemonics);
  const changed = await writeAtomically(content);

  console.log(
    `${changed ? '已生成' : '无需更新'} ${OUTPUT_PATH}（ETH ${eth.length}，BTC ${btc.length}）`
  );
}

main().catch(error => {
  const message = error instanceof Error ? error.message : '未知生成错误';
  console.error(`多签 fixture 生成失败：${message}`);
  process.exitCode = 1;
});
