export const cutString = (str: string | undefined, cutLen: number): [string, string] => {
  if (!str) {
    return ['', ''];
  }
  const first = str.slice(0, cutLen);
  const second = str.slice(cutLen);
  return [first, second];
};
