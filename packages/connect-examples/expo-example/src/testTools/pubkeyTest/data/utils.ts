import { INDEX_MARK, baseParams } from '../baseParams';
import { PubkeyTestCase } from '../types';
import { PubkeyTestCaseData } from './types';

export function fullPath(data: PubkeyTestCaseData): PubkeyTestCaseData {
  const newParams = data.data.map((item, index) => {
    // @ts-expect-error
    const commonParams = baseParams[item.method];
    return {
      ...item,
      params: {
        ...commonParams,
        ...item.params,
      },
    };
  });

  return {
    ...data,
    data: newParams,
  };
}

export function convertTestSingleData(
  data: PubkeyTestCaseData,
  options?: {
    getOnlyOne: boolean;
  }
): PubkeyTestCase {
  const testCase = fullPath(data);

  const dataList: PubkeyTestCase['data'] = [];
  for (const item of testCase.data) {
    const keys = Object.keys(item.result);
    for (let i = 0; i < keys.length; i++) {
      const index = parseInt(keys[i]);

      if (options?.getOnlyOne && index > 0) {
        break;
      }

      let { path } = item.params;
      if (path && path.indexOf(INDEX_MARK) !== -1) {
        path = path.replace(INDEX_MARK, index);
      }

      dataList.push({
        ...item,
        title: `${item.name || item.method} -- ${index} -- ${path}`,
        params: {
          ...item.params,
          path,
        },
        result: Object.values(item.result)[index],
      });
    }
  }

  return {
    ...testCase,
    id: data.name,
    data: dataList,
    extra: {
      passphraseState: data.passphraseState,
      passphrase: data.passphrase,
    },
  } as PubkeyTestCase;
}

export function convertTestBatchData(data: PubkeyTestCaseData): PubkeyTestCase {
  const testCase = fullPath(data);

  const dataList: PubkeyTestCase['data'] = [];
  for (const item of testCase.data) {
    const bundle = [];
    const results: Record<string, { address: string }> = {};
    const keys = Object.keys(item.result);
    for (let i = 0; i < keys.length; i++) {
      const index = parseInt(keys[i]);

      let { path } = item.params;
      if (path && path.indexOf(INDEX_MARK) !== -1) {
        path = path.replace(INDEX_MARK, index);
      }
      bundle.push({
        ...item.params,
        path,
      });
      results[path] = Object.values(item.result)[index];
    }
    dataList.push({
      ...item,
      title: `${item.name || item.method}`,
      params: {
        bundle,
      },
      result: results,
    });
  }

  return {
    ...testCase,
    id: data.name,
    data: dataList,
    extra: {
      passphraseState: data.passphraseState,
      passphrase: data.passphrase,
    },
  } as PubkeyTestCase;
}
