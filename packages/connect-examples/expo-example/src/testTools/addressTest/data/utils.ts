import { INDEX_MARK, baseParams } from '../baseParams';
import {
  AddressBatchCaseData,
  AddressBatchTestCase,
  AddressCaseData,
  AddressTestCase,
} from '../types';
import { AddressTestCaseData } from './types';

export function fullPath(data: AddressTestCaseData): AddressTestCaseData {
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
  data: AddressTestCaseData,
  options?: {
    getOnlyOne: boolean;
  }
): AddressTestCase {
  const testCase = fullPath(data);

  const dataList: AddressCaseData[] = [];
  for (const item of testCase.data) {
    const keys = Object.keys(item.expectedAddress);
    for (let i = 0; i < keys.length; i++) {
      const index = parseInt(keys[i]);

      if (options?.getOnlyOne && index > 0) {
        break;
      }

      if (item.params?.addressParameters?.path) {
        // ada case
        let { path, stakingPath } = item.params.addressParameters;
        if (path && path.indexOf(INDEX_MARK) !== -1) {
          path = path.replace(INDEX_MARK, index);
        }
        if (stakingPath && stakingPath.indexOf(INDEX_MARK) !== -1) {
          stakingPath = stakingPath.replace(INDEX_MARK, index);
        }

        dataList.push({
          ...item,
          title: `${item.name || item.method} -- ${path}`,
          params: {
            ...item.params,
            addressParameters: {
              ...item.params.addressParameters,
              path,
              stakingPath,
            },
          },
          template: path,
          result: {
            address: item.expectedAddress[index],
          },
        });
      } else {
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
          template: path,
          result: {
            address: item.expectedAddress[index],
          },
        });
      }
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
  } as AddressTestCase;
}

export function convertTestBatchData(data: AddressTestCaseData): AddressBatchTestCase {
  const testCase = fullPath(data);

  const dataList: AddressBatchCaseData[] = [];
  for (const item of testCase.data) {
    if (item.params?.addressParameters?.path) {
      // ada case
      const bundle = [];
      const results: Record<string, { address: string }> = {};
      const keys = Object.keys(item.expectedAddress);
      for (let i = 0; i < keys.length; i++) {
        const index = parseInt(keys[i]);

        let { path, stakingPath } = item.params.addressParameters;
        if (path && path.indexOf(INDEX_MARK) !== -1) {
          path = path.replace(INDEX_MARK, index);
        }
        if (stakingPath && stakingPath.indexOf(INDEX_MARK) !== -1) {
          stakingPath = stakingPath.replace(INDEX_MARK, index);
        }

        bundle.push({
          ...item.params,
          addressParameters: {
            ...item.params.addressParameters,
            path,
            stakingPath,
          },
        });
        results[path] = {
          address: item.expectedAddress[index],
        };
      }

      dataList.push({
        ...item,
        title: `${item.name || item.method}`,
        params: {
          bundle,
        },
        result: results,
      });
    } else {
      const bundle = [];
      const results: Record<string, { address: string }> = {};
      const keys = Object.keys(item.expectedAddress);
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
        results[path] = {
          address: item.expectedAddress[index],
        };
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
  }

  return {
    ...testCase,
    id: data.name,
    data: dataList,
    extra: {
      passphraseState: data.passphraseState,
      passphrase: data.passphrase,
    },
  } as AddressBatchTestCase;
}
