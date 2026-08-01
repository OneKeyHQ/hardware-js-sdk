import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Buffer } from 'buffer';
import process from 'process';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = process;
} else {
  Object.assign(global.process, process);
}
