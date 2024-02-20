/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, '../node_modules/@onekeyfe/hd-web-sdk/build/');
const targetDir = path.join(
  __dirname,
  '../packages/connect-examples/electron-example/public/js-sdk/'
);

async function copyFiles() {
  try {
    await fs.ensureDir(targetDir);
    console.log(`Target directory ${targetDir} is ensured`);

    await fs.copy(sourceDir, targetDir, {
      recursive: true,
      overwrite: true,
    });
    console.log(`Files copied from ${sourceDir} to ${targetDir}`);
  } catch (error) {
    console.error('Error copying files:', error);
  }
}

copyFiles();
