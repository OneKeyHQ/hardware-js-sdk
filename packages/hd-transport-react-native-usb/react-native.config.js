module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import so.onekey.hardware.usb.OneKeyUsbPackage;',
        packageInstance: 'new OneKeyUsbPackage()',
      },
      ios: null,
    },
  },
};
