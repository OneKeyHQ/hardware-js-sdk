/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

const config = require('./moniter-config.json');

// 从 .env 文件获取目标路径
const targetDir = process.env[config.targetEnvVar];

if (!targetDir) {
  console.error(
    'Target directory APP_MONOREPO_LOCAL_PATH is not set. Please specify it in the .env file.'
  );
  process.exit(1);
}

// 源目录基础路径
const { basePath, projects, specialProjects } = config;

// 创建监视路径数组（现在监视整个项目目录）
const watchPaths = projects.flatMap(project => {
  const watchDirs = specialProjects[project] || [config.defaultWatchDir];
  return watchDirs.map(dir => {
    const dirPath = path.join(basePath, project, dir);
    console.log('Observe directory file changes:', dirPath);
    return dirPath;
  });
});

// 复制文件函数
function copyFile(src, dest, ignoreLog) {
  fs.copy(src, dest, { overwrite: true })
    .then(() => {
      if (!ignoreLog) {
        console.log(`Copied ${src} to ${dest}`);
      }
    })
    .catch(err => console.error(`Error copying ${src} to ${dest}:`, err));
}

// 初始化 chokidar watcher
const watcher = chokidar.watch(watchPaths, {
  ignored: [
    // eslint-disable-next-line no-useless-escape
    /(^|[\/\\])\./, // 忽略点文件
    ...config.ignoredPaths.map(p => `**/${p}/**`), // 从配置文件中添加忽略路径
  ],
  persistent: true,
});

// 统一的文件处理函数
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

    // 构建目标路径
    const destPath = path.join(targetDir, 'node_modules', packageName, watchDir, ...restPath);

    try {
      if (eventType === 'unlink') {
        // 删除文件
        await fs.remove(destPath);
        console.log(`Removed ${destPath}`);
      } else {
        // 添加或更新文件
        copyFile(filePath, destPath, eventType === 'add');
      }
    } catch (err) {
      console.error(`Error ${eventType === 'unlink' ? 'removing' : 'copying'} ${filePath}:`, err);
    }
  } else {
    console.warn(`package.json not found for project ${projectName}. Skipping file: ${filePath}`);
  }
}

// 设置 watcher 事件
watcher
  .on('add', filePath => handleFileEvent(filePath, 'add'))
  .on('change', filePath => handleFileEvent(filePath, 'change'))
  .on('unlink', filePath => handleFileEvent(filePath, 'unlink'))
  .on('error', error => console.error(`Watcher error: ${error}`))
  .on('ready', () => console.log('Initial scan complete. Ready for changes.'));

// 优雅退出
process.on('SIGINT', () => {
  console.log('Closing watcher...');
  watcher.close();
  console.log('Watcher closed. Exiting.');
  process.exit(0);
});
