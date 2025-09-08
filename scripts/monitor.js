/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

const config = require('./monitor-config.json');

const targetDir = process.env[config.targetEnvVar];

if (!targetDir) {
  console.error(
    'Target directory APP_MONOREPO_LOCAL_PATH is not set. Please specify it in the .env file.'
  );
  process.exit(1);
}

const { basePath, projects, specialProjects } = config;

const watchPaths = projects.flatMap(project => {
  const watchDirs = specialProjects[project] || [config.defaultWatchDir];
  return watchDirs.map(dir => {
    const dirPath = path.join(basePath, project, dir);
    console.log('Observe directory file changes:', dirPath);
    return dirPath;
  });
});

function copyFile(src, dest, ignoreLog) {
  fs.copy(src, dest, { overwrite: true })
    .then(() => {
      if (!ignoreLog) {
        console.log(`Copied ${src} to ${dest}`);
      }
    })
    .catch(err => console.error(`Error copying ${src} to ${dest}:`, err));
}

const watcher = chokidar.watch(watchPaths, {
  ignored: [
    // eslint-disable-next-line no-useless-escape
    /(^|[\/\\])\./, // 忽略点文件
    ...config.ignoredPaths.map(p => `**/${p}/**`),
  ],
  persistent: true,
});

async function handleFileEvent(filePath, eventType) {
  const relativePath = path.relative(basePath, filePath);
  const [projectName, watchDir, ...restPath] = relativePath.split(path.sep);

  if (!projects.includes(projectName)) {
    console.warn(`Project ${projectName} not found in config. Skipping file: ${filePath}`);
    return;
  }

  const packageJsonPath = path.join(basePath, projectName, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    const packageName = packageJson.name;

    const destPath = path.join(targetDir, 'node_modules', packageName, watchDir, ...restPath);

    try {
      if (eventType === 'delete') {
        await fs.remove(destPath);
        console.log(`Removed ${destPath}`);
      } else {
        copyFile(filePath, destPath, eventType === 'add');
      }

      // 特殊处理 web-sdk/build 文件夹
      if (projectName === 'hd-web-sdk' && watchDir === 'build') {
        const additionalDestPath = path.join(
          targetDir,
          'apps/desktop/public/static/js-sdk',
          ...restPath
        );
        if (eventType === 'delete') {
          await fs.remove(additionalDestPath);
          console.log(`Removed ${additionalDestPath}`);
        } else {
          copyFile(filePath, additionalDestPath, eventType === 'add');
        }
      }
    } catch (err) {
      console.error(`Error ${eventType === 'delete' ? 'removing' : 'copying'} ${filePath}:`, err);
    }
  } else {
    console.warn(`package.json not found for project ${projectName}. Skipping file: ${filePath}`);
  }
}

watcher
  .on('add', filePath => handleFileEvent(filePath, 'add'))
  .on('change', filePath => handleFileEvent(filePath, 'change'))
  .on('unlink', filePath => handleFileEvent(filePath, 'delete'))
  .on('error', error => console.error(`Watcher error: ${error}`))
  .on('ready', () => console.log('Initial scan complete. Ready for changes.'));

process.on('SIGINT', () => {
  console.log('Closing watcher...');
  watcher.close();
  console.log('Watcher closed. Exiting.');
  process.exit(0);
});
