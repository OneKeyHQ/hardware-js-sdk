const vendoredTrezorPackages = [
  'hwk-trezor-protobuf',
  'hwk-trezor-protocol',
  'hwk-trezor-schema-utils',
  'hwk-trezor-transport',
  'hwk-trezor-transport-common',
  'hwk-trezor-transport-web',
  'hwk-trezor-type-utils',
  'hwk-trezor-utils',
];

const isVendoredTrezorFile = file =>
  vendoredTrezorPackages.some(packageName =>
    file.split('\\').join('/').includes(`/packages/${packageName}/`),
  );

const quote = file => JSON.stringify(file);

module.exports = {
  '*.{js,jsx,ts,tsx}': files => {
    const lintableFiles = files.filter(file => !isVendoredTrezorFile(file));

    return lintableFiles.length > 0 ? [`eslint --fix ${lintableFiles.map(quote).join(' ')}`] : [];
  },
};
