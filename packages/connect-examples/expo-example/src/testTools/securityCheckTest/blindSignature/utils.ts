import { COINTYPE_MARK, baseParams } from './baseParams';
import { TestCaseDataType } from './data';
import type { SecurityCheckTestCase } from './types';

export function fullPath(data: TestCaseDataType[]): TestCaseDataType[] {
  const newParams = data.map((item, index) => {
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

  return newParams;
}

export function replaceTemplate(key: string, template: string) {
  let path = template;

  let index = 0;

  index = parseInt(key);

  if (path.indexOf(COINTYPE_MARK) !== -1) {
    path = template.replace(COINTYPE_MARK, index.toString());
  }

  return path;
}

export function convertTestData(
  data: TestCaseDataType[],
  options?: {
    getOnlyOne: boolean;
  }
): SecurityCheckTestCase {
  const testCase = fullPath(data);

  const dataList: SecurityCheckTestCase['data'] = [];
  for (const item of testCase) {
    const keys = Object.keys(item.expected);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (item.params.path != null) {
        const path = replaceTemplate(key, item.params.path);
        dataList.push({
          id: `${item.method}-${key}`,
          title: `${item.method} -- ${key} -- ${path}`,
          path,
          method: item.method,
          params: {
            ...item.params,
            path,
          },
          expect: item.expected[key],
        });
      } else if (item.params.inputs.length && item.params.inputs[0].path != null) {
        const path = replaceTemplate(key, item.params.inputs[0].path);
        dataList.push({
          id: `${item.method}-${key}`,
          title: `${item.method} -- ${key} -- ${path}`,
          path,
          method: item.method,
          params: {
            ...item.params,
            path,
            inputs: item.params.inputs.map((input: any) => ({
              ...input,
              path,
            })),
          },
          expect: item.expected[key],
        });
      }
    }
  }

  return {
    id: '',
    name: '',
    description: '',
    data: dataList,
  };
}
