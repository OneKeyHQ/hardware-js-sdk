import { singleAddressTestCount24Two } from './count24_two';

function getTestChainName(chain?: string, name?: string) {
  if (chain) {
    // 分割 chain 字符串
    const parts = chain.split('-');
    // 获取第一个部分并将 CamelCase 转换为正常的字符串
    const firstWordMatch = parts[0].match(/^[a-z]+|[A-Z][a-z]*/g);
    let firstPart = '';
    if (firstWordMatch && firstWordMatch.length > 0) {
      const firstWord = firstWordMatch[0];
      firstPart = firstWord.charAt(0).toUpperCase() + firstWord.slice(1); // 首字母大写
    }
    const secondPart = parts.length > 1 ? parts[1] : '';
    return `${firstPart} ${secondPart}`.trim(); // 合并两个部分并去除空格
  }
  if (name) {
    // 只取 camelCase 字符串的第一个单词
    const firstWordMatch = name.match(/^[a-z]+|[A-Z][a-z]*/g);
    if (firstWordMatch && firstWordMatch.length > 0) {
      const firstWord = firstWordMatch[0];
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1); // 首字母大写
    }
  }
  return ''; // 如果 chain 和 name 都不存在或无法解析，则返回空字符串
}

describe('generate markdown', () => {
  it('run', () => {
    const testDataList = singleAddressTestCount24Two.splice(1);

    const data = testDataList[0];
    const caseSize = testDataList.length;

    const title = `| Test Chain | Derivation Path |${' Address |'.repeat(caseSize)}`;
    const split = `|---|---|${'---|'.repeat(caseSize)}`;

    let passphraseState = `| | |`;
    testDataList.forEach(item => {
      const passphrase = item.extra?.passphrase ?? '';
      passphraseState += ` ${passphrase} |`;
    });

    const markdownTable = [title, split, passphraseState];

    let tempTitle = '';
    data.data.forEach((item, index) => {
      let path = '';
      const isCardano = item.method === 'cardanoGetAddress';
      if (isCardano) {
        path = `path: \`\`\`${item.params.addressParameters.path}\`\`\` stakingPath: \`\`\`${item.params.addressParameters.stakingPath}\`\`\``;
      } else {
        path = `\`\`\`${item.params.path}\`\`\``;
      }

      const chain = getTestChainName(item.name, item.method);
      let title = '';
      if (chain !== tempTitle) {
        title = chain;
      }

      let row = `| ${title} | ${path} |`;

      testDataList.forEach(item => {
        const { address } = item.data[index].result;
        row += ` ${address} |`;
      });

      tempTitle = chain;
      markdownTable.push(row);
    });

    console.log(markdownTable.join('\n'));
  });
});