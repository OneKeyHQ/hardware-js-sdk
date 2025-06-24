const fs = require('fs');
const path = require('path');

// 已经完全同步的链
const syncedChains = [
  'ethereum',
  'cardano',
  'bitcoin',
  'tron',
  'algo',
  'aptos',
  'solana',
  'polkadot',
  'nervos',
];

// 读取并解析文件的函数
function readAndParseFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 对于 expo-example，统计 presupposes 数量
    if (filePath.includes('expo-example')) {
      const presupposesMatches = content.match(/presupposes:\s*\[/g);
      if (!presupposesMatches) return 0;

      // 更精确地统计每个方法的预设数量
      const methodMatches = content.match(
        /{\s*method:\s*['"]([^'"]+)['"],[\s\S]*?presupposes:\s*\[([\s\S]*?)\]/g
      );
      if (!methodMatches) return 0;

      let totalPresets = 0;
      methodMatches.forEach(methodMatch => {
        // 统计每个方法内的预设数量
        const titleMatches = methodMatch.match(/title:\s*['"][^'"]*['"]/g);
        if (titleMatches) {
          totalPresets += titleMatches.length;
        }
      });

      return totalPresets;
    }

    // 对于 new-example，统计 presets 数量
    if (filePath.includes('new-example')) {
      const presetMatches = content.match(/presets:\s*\[/g);
      if (!presetMatches) return 0;

      // 更精确地统计每个方法的预设数量
      const methodMatches = content.match(
        /{\s*method:\s*['"]([^'"]+)['"],[\s\S]*?presets:\s*\[([\s\S]*?)\]/g
      );
      if (!methodMatches) return 0;

      let totalPresets = 0;
      methodMatches.forEach(methodMatch => {
        // 统计每个方法内的预设数量
        const titleMatches = methodMatch.match(/title:\s*['"][^'"]*['"]/g);
        if (titleMatches) {
          totalPresets += titleMatches.length;
        }
      });

      return totalPresets;
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

// 获取所有链文件
function getAllChainFiles() {
  const expoDir = 'packages/connect-examples/expo-example/src/data';
  const newDir = 'packages/connect-examples/new-example/app/data/methods';

  const chains = {};

  // 读取 expo-example 目录
  if (fs.existsSync(expoDir)) {
    const expoFiles = fs
      .readdirSync(expoDir)
      .filter(file => file.endsWith('.ts') && !file.includes('index'))
      .map(file => file.replace('.ts', ''));

    expoFiles.forEach(chain => {
      if (!chains[chain]) chains[chain] = {};
      chains[chain].expo = path.join(expoDir, `${chain}.ts`);
    });
  }

  // 读取 new-example 目录
  if (fs.existsSync(newDir)) {
    const newFiles = fs
      .readdirSync(newDir)
      .filter(file => file.endsWith('.ts') && !file.includes('index') && !file.includes('types'))
      .map(file => file.replace('.ts', ''));

    newFiles.forEach(chain => {
      if (!chains[chain]) chains[chain] = {};
      chains[chain].new = path.join(newDir, `${chain}.ts`);
    });
  }

  return chains;
}

// 检查 TON 链
function checkTONChain() {
  console.log('=== TON 链分析 ===');

  const expoPath = 'packages/connect-examples/expo-example/src/data/ton.ts';
  const newPath = 'packages/connect-examples/new-example/app/data/methods/ton.ts';

  const expoCount = readAndParseFile(expoPath);
  const newCount = readAndParseFile(newPath);

  console.log(`expo-example TON 预设数量: ${expoCount}`);
  console.log(`new-example TON 预设数量: ${newCount}`);

  if (newCount > expoCount) {
    console.log('⚠️  TON 链在 new-example 中有多余的预设！');
    console.log(`多余预设数量: ${newCount - expoCount}`);

    // 读取两个文件内容进行详细比较
    try {
      const expoContent = fs.readFileSync(expoPath, 'utf8');
      const newContent = fs.readFileSync(newPath, 'utf8');

      // 提取方法和预设标题
      const expoMethods = extractMethodsAndPresets(expoContent, 'expo');
      const newMethods = extractMethodsAndPresets(newContent, 'new');

      console.log('\n详细比较:');
      console.log('expo-example 方法和预设:');
      expoMethods.forEach(method => {
        console.log(`  ${method.method}: ${method.presets.join(', ')}`);
      });

      console.log('\nnew-example 方法和预设:');
      newMethods.forEach(method => {
        console.log(`  ${method.method}: ${method.presets.join(', ')}`);
      });
    } catch (error) {
      console.log('读取文件内容失败:', error.message);
    }
  } else if (newCount < expoCount) {
    console.log('❌ TON 链在 new-example 中缺少预设');
    console.log(`缺少预设数量: ${expoCount - newCount}`);
  } else {
    console.log('✅ TON 链预设数量匹配');
  }

  return newCount > expoCount;
}

// 提取方法和预设标题
function extractMethodsAndPresets(content, type) {
  const methods = [];

  if (type === 'expo') {
    const methodMatches = content.match(
      /{\s*method:\s*['"]([^'"]+)['"],[\s\S]*?presupposes:\s*\[([\s\S]*?)\]/g
    );
    if (methodMatches) {
      methodMatches.forEach(methodMatch => {
        const methodName = methodMatch.match(/method:\s*['"]([^'"]+)['"]/);
        const titleMatches = methodMatch.match(/title:\s*['"]([^'"]*)['"]/g);

        if (methodName && titleMatches) {
          methods.push({
            method: methodName[1],
            presets: titleMatches.map(title => title.match(/title:\s*['"]([^'"]*)['"]/)[1]),
          });
        }
      });
    }
  } else {
    const methodMatches = content.match(
      /{\s*method:\s*['"]([^'"]+)['"],[\s\S]*?presets:\s*\[([\s\S]*?)\]/g
    );
    if (methodMatches) {
      methodMatches.forEach(methodMatch => {
        const methodName = methodMatch.match(/method:\s*['"]([^'"]+)['"]/);
        const titleMatches = methodMatch.match(/title:\s*['"]([^'"]*)['"]/g);

        if (methodName && titleMatches) {
          methods.push({
            method: methodName[1],
            presets: titleMatches.map(title => title.match(/title:\s*['"]([^'"]*)['"]/)[1]),
          });
        }
      });
    }
  }

  return methods;
}

// 分析剩余需要同步的链
function analyzeRemainingChains() {
  console.log('\n=== 剩余链分析 ===');

  const chains = getAllChainFiles();
  const remaining = [];

  Object.keys(chains).forEach(chainName => {
    if (syncedChains.includes(chainName)) {
      return; // 跳过已同步的链
    }

    const chain = chains[chainName];
    const expoCount = chain.expo ? readAndParseFile(chain.expo) : 0;
    const newCount = chain.new ? readAndParseFile(chain.new) : 0;

    if (expoCount > 0 || newCount > 0) {
      remaining.push({
        name: chainName,
        expo: expoCount,
        new: newCount,
        diff: expoCount - newCount,
        priority: expoCount > newCount ? 'high' : expoCount < newCount ? 'low' : 'synced',
      });
    }
  });

  // 按差异排序
  remaining.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  console.log('需要处理的链:');
  console.log('链名\t\texpo\tnew\t差异\t优先级');
  console.log('----------------------------------------');

  let highPriorityCount = 0;
  let lowPriorityCount = 0;

  remaining.forEach(chain => {
    const status = chain.priority === 'high' ? '❌' : chain.priority === 'low' ? '⚠️' : '✅';
    console.log(
      `${chain.name.padEnd(12)}\t${chain.expo}\t${chain.new}\t${chain.diff > 0 ? '+' : ''}${
        chain.diff
      }\t${status} ${chain.priority}`
    );

    if (chain.priority === 'high') highPriorityCount++;
    if (chain.priority === 'low') lowPriorityCount++;
  });

  console.log('\n统计:');
  console.log(`高优先级 (缺少预设): ${highPriorityCount}`);
  console.log(`低优先级 (多余预设): ${lowPriorityCount}`);
  console.log(`已同步链数量: ${syncedChains.length}`);
  console.log(`总链数量: ${Object.keys(chains).length}`);

  // 推荐下一步处理的链
  const nextChains = remaining
    .filter(chain => chain.priority === 'high' && chain.diff >= 3)
    .slice(0, 5);

  if (nextChains.length > 0) {
    console.log('\n推荐优先处理的链 (差异>=3):');
    nextChains.forEach((chain, index) => {
      console.log(`${index + 1}. ${chain.name} (缺少 ${chain.diff} 个预设)`);
    });
  }

  return remaining;
}

// 主函数
function main() {
  console.log('检查 TON 链和其他剩余链的同步状态...\n');

  // 检查 TON 链
  const tonHasExtra = checkTONChain();

  // 分析剩余链
  const remaining = analyzeRemainingChains();

  console.log('\n=== 总结 ===');
  if (tonHasExtra) {
    console.log('TON 链有多余预设，需要检查是否需要移除');
  } else {
    console.log('TON 链预设数量正常');
  }

  const needSync = remaining.filter(chain => chain.priority === 'high').length;
  if (needSync > 0) {
    console.log(`还有 ${needSync} 个链需要同步预设`);
  } else {
    console.log('所有主要链都已同步完成！');
  }
}

main();
