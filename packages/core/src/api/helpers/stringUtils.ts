export const cutString = (str: string | undefined, cutLen: number): [string, string] => {
  if (!str) {
    return ['', ''];
  }
  const first = str.slice(0, cutLen);
  const second = str.slice(cutLen);
  return [first, second];
};

export const toSnakeCase = (val: string): string =>
  val.replace(/([A-Z])/g, el => `_${el.toLowerCase()}`);
