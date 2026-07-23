import packageJson from '../../package.json';
import { program } from '../cli';

describe('CLI 版本', () => {
  test('与发布包 package.json 使用同一个版本来源', () => {
    expect(program.version()).toBe(packageJson.version);
  });
});
