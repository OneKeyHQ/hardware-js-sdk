import * as ByteBufferJS from 'bytebuffer';
import { getDefaultExportFromNamespaceIfPresent } from './namespace';

const ByteBuffer = getDefaultExportFromNamespaceIfPresent(ByteBufferJS);

export { ByteBuffer };
