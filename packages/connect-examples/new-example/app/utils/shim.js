/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

// 使用 ES module import 来导入 Buffer
import { Buffer as BufferPolyfill } from 'buffer';

// 设置 Buffer 全局变量
if (typeof Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;
  window.Buffer = BufferPolyfill;

  console.log('Buffer polyfill loaded successfully via ES module');
} else {
  console.log('Buffer already available');
}

// 验证 Buffer 是否正常工作
try {
  const testBuffer = Buffer.from('test', 'utf8');
  if (testBuffer && testBuffer.length === 4) {
    console.log('Buffer polyfill verification passed');
  } else {
    console.error('Buffer polyfill verification failed');
  }
} catch (error) {
  console.error('Buffer polyfill verification error:', error);
}
