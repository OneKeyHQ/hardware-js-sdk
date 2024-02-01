import { ADDRESS_INDEX_MARK, CHANGE_MARK, INDEX_MARK, baseParams } from '../baseParams';
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

export function replaceTemplate(key: string, template: string) {
  let path = template;

  let index = 0;
  let change = 0;
  let addressIndex = 0;
  if (key.indexOf('/') !== -1) {
    const keys = key.split('/');
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith('C')) {
        change = parseInt(keys[i].slice(1));
      } else if (keys[i].startsWith('A')) {
        addressIndex = parseInt(keys[i].slice(1));
      } else {
        index = parseInt(keys[i]);
      }
    }
  } else {
    index = parseInt(key);
  }

  if (path.indexOf(INDEX_MARK) !== -1) {
    path = template.replace(INDEX_MARK, index.toString());
  }
  if (path.indexOf(CHANGE_MARK) !== -1) {
    path = path.replace(CHANGE_MARK, change.toString());
  }
  if (path.indexOf(ADDRESS_INDEX_MARK) !== -1) {
    path = path.replace(ADDRESS_INDEX_MARK, addressIndex.toString());
  }

  return path;
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
    let count = 0;
    for (let i = 0; i < keys.length; i++) {
      if (options?.getOnlyOne && count > 0) {
        break;
      }
      count += 1;

      const key = keys[i];
      const path = replaceTemplate(key, item.params.path);

      dataList.push({
        ...item,
        title: `${item.name || item.method} -- ${key} -- ${path}`,
        params: {
          ...item.params,
          path,
        },
        result: item.result[key],
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
      const key = keys[i];
      const path = replaceTemplate(key, item.params.path);

      bundle.push({
        ...item.params,
        path,
      });

      results[path] = item.result[key];
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
