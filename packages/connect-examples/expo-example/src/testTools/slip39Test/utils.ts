/**
 * SLIP39 测试数据转换工具
 * 统一处理地址和公钥测试数据的转换
 */

import {
  SLIP39BatchTestCase,
  SLIP39BatchTestCaseData,
  SLIP39BatchTestCaseExtra,
  SLIP39TestCaseData,
} from './types';

/**
 * 转换SLIP39测试数据为bundle格式（参考addressTest的实现）
 * 将同一方法的多个路径合并为一个bundle请求，类似addressTest的方式
 */
export function convertToBundleFormat(
  data: SLIP39TestCaseData,
  testType: 'address' | 'pubkey'
): SLIP39BatchTestCase {
  const convertedData: SLIP39BatchTestCaseData[] = [];

  // 处理每个方法，将多个路径合并为bundle请求
  data.data.forEach((item, methodIndex) => {
    const expectedData = testType === 'address' ? item.expectedAddress : item.expectedPublicKey;
    const testTypeLabel = testType === 'address' ? '地址' : '公钥';

    if (expectedData && Object.keys(expectedData).length > 0) {
      // 创建bundle参数数组和结果对象
      const bundle = [];
      const results: Record<string, { address?: string; publicKey?: string }> = {};
      const keys = Object.keys(expectedData);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const resolvedParams = { ...item.params };

        // 处理路径模板替换
        if (resolvedParams.path?.includes('$$INDEX$$')) {
          resolvedParams.path = key;
        }

        // 处理特殊的addressParameters（如Cardano）
        if (resolvedParams.addressParameters?.path?.includes('$$INDEX$$')) {
          const pathTemplate = resolvedParams.addressParameters.path;
          const stakingPathTemplate = resolvedParams.addressParameters.stakingPath;

          // 从完整路径中提取索引来替换模板
          const indexMatch = key.match(/m\/\d+'\/\d+'\/(\d+)'/);
          const indexValue = indexMatch ? indexMatch[1] : '0';

          resolvedParams.addressParameters = {
            ...resolvedParams.addressParameters,
            path: pathTemplate.replace('$$INDEX$$', indexValue),
            stakingPath: stakingPathTemplate?.replace('$$INDEX$$', indexValue),
          };
        }

        bundle.push({
          ...resolvedParams,
          showOnOneKey: false,
        });

        // 初始化结果对象
        if (testType === 'address') {
          results[key] = { address: expectedData[key] };
        } else {
          results[key] = { publicKey: expectedData[key] };
        }
      }

      // 创建单个测试用例，包含bundle参数
      convertedData.push({
        id: `${item.method}-${methodIndex}-bundle`,
        method: item.method,
        title: `${item.name || item.method} (Bundle ${keys.length} paths)`,
        description: `${item.name || item.method} ${testTypeLabel}批量测试 - ${keys.length} 个路径`,
        params: { bundle },
        result: {},
        expectedAddress: testType === 'address' ? expectedData : undefined,
        expectedPublicKey: testType === 'pubkey' ? expectedData : undefined,
        testType,
      });
    } else {
      // 没有期望数据的回退处理
      convertedData.push({
        id: `${item.method}-${methodIndex}-single`,
        method: item.method,
        title: item.name || item.method,
        description: `${item.name || item.method} ${testTypeLabel}测试`,
        params: item.params || {},
        result: {},
        expectedAddress: testType === 'address' ? item.expectedAddress : undefined,
        expectedPublicKey: testType === 'pubkey' ? item.expectedPublicKey : undefined,
        testType,
      });
    }
  });

  const extra: SLIP39BatchTestCaseExtra = {
    passphrase: data.passphrase,
    passphraseState: data.passphraseState || '',
    shares: data.shares || [],
  };

  return {
    id: data.name,
    name: data.name,
    description: data.description,
    passphrase: data.passphrase,
    passphraseState: data.passphraseState,
    data: convertedData,
    extra,
  };
}
