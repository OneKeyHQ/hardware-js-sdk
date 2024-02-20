/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs-extra');
const path = require('path');

const src = path.join(__dirname, '..', 'web-build');
const dest = path.join(__dirname, '..', '..', 'electron-example', 'web-build');

fs.remove(dest);

fs.move(src, dest, { overwrite: true })
  .then(() => console.log('Move completed successfully.'))
  .catch(err => console.error(err));
