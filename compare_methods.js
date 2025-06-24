#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 目录路径
const expoDir = 'packages/connect-examples/expo-example/src/data';
const newExampleDir = 'packages/connect-examples/new-example/app/data/methods';

// 获取目录中的所有 .ts 文件
function getTsFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`目录不存在: ${dir}`);
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.ts'))
    .map(file => file.replace('.ts', ''))
    .sort();
}

// 排除的文件
const excludeFiles = ['device', 'firmware', '_template', 'basic', 'index'];

console.log('🔍 对比两个目录中的方法文件...\n');

const expoFiles = getTsFiles(expoDir).filter(f => !excludeFiles.includes(f));
const newExampleFiles = getTsFiles(newExampleDir).filter(f => !excludeFiles.includes(f));

console.log(`📁 Expo Example 文件 (${expoFiles.length}):`, expoFiles.join(', '));
console.log(`📁 New Example 文件 (${newExampleFiles.length}):`, newExampleFiles.join(', '));

// 找出差异
const expoOnly = expoFiles.filter(f => !newExampleFiles.includes(f));
const newExampleOnly = newExampleFiles.filter(f => !expoFiles.includes(f));
const common = expoFiles.filter(f => newExampleFiles.includes(f));

console.log('\n📊 对比结果:');
console.log(`✅ 共同文件 (${common.length}):`, common.join(', '));

if (expoOnly.length > 0) {
  console.log(`🔴 仅在 Expo Example 中存在 (${expoOnly.length}):`, expoOnly.join(', '));
}

if (newExampleOnly.length > 0) {
  console.log(`🔵 仅在 New Example 中存在 (${newExampleOnly.length}):`, newExampleOnly.join(', '));
}

// 文件名映射检查
const fileMapping = {
  algo: 'algorand',
  ripple: 'xrp',
};

console.log('\n🔄 检查文件名映射:');
for (const [expoName, newName] of Object.entries(fileMapping)) {
  const hasExpo = expoFiles.includes(expoName);
  const hasNew = newExampleFiles.includes(newName);
  console.log(`${expoName} -> ${newName}: Expo(${hasExpo}) New(${hasNew})`);
}

console.log('\n📋 需要处理的文件:');
expoOnly.forEach(file => {
  console.log(`- 需要从 expo-example 复制/创建: ${file}.ts`);
});
