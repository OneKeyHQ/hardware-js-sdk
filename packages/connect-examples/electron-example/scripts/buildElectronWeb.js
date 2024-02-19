const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const commandToRun = args[0];

const commands = {
  build: {
    main: 'yarn build:main',
    electronWeb: 'yarn build:electron-web',
  },
  dev: {
    main: 'yarn build:main',
    electronWeb: 'yarn dev:electron-web',
  },
};

const rootDir = process.cwd();
const expoExampleDir = path.join(rootDir, '../expo-example');

function runCommand(command, cwd) {
  try {
    execSync(command, { stdio: 'inherit', cwd });
    console.log(`Successfully executed command: ${command}`);
  } catch (error) {
    console.error(`Error executing command: ${command}\n`, error);
    process.exit(1);
  }
}

if (commands[commandToRun]) {
  runCommand(commands[commandToRun].main, rootDir);
  runCommand(commands[commandToRun].electronWeb, expoExampleDir);
} else {
  console.error('Invalid command. Please specify "build" or "dev".');
  process.exit(1);
}
