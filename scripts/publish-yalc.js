/* eslint-disable @typescript-eslint/no-var-requires */
const shell = require('shelljs');
const chalk = require('chalk');

console.log(chalk.green('1. Check system environment...'));

if (!shell.which('yalc')) {
  console.log(
    chalk.red('Sorry, this script requires yalc, please install it first. [npm install -g yalc]')
  );
  shell.exit(1);
} else {
  console.log('Check success.');
}

console.log(chalk.green('2. publish library to local registry...'));
shell.cd('./packages/core');

const needPublishLibrary = [
  'core',
  'hd-ble-sdk',
  'hd-common-connect-sdk',
  'hd-react-native-udp-sdk',
  'hd-transport',
  'hd-transport-http',
  'hd-transport-lowlevel',
  'hd-transport-react-native',
  'hd-transport-webusb',
  'hd-web-sdk',
  'shared',
];

needPublishLibrary.forEach((library, index) => {
  console.log(chalk.green(`2.${index + 1} publish 「${library}」...`));
  shell.cd(`../${library}`);
  shell.exec('yalc publish --replace --changed');
});

console.log(chalk.green('3. Done'));
