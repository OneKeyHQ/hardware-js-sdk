const MESSAGE_TOP_CHAR = 63;
const MESSAGE_HEADER_BYTE = 35;
const BUFFER_SIZE = 63;
export const COMMON_HEADER_SIZE = 6;

export const isHeaderChunk = (chunk) => {
  if (chunk.length < 9) return false;
  const [MagicQuestionMark, sharp1, sharp2] = chunk;

  if (
    String.fromCharCode(MagicQuestionMark) === String.fromCharCode(MESSAGE_TOP_CHAR) &&
    String.fromCharCode(sharp1) === String.fromCharCode(MESSAGE_HEADER_BYTE) &&
    String.fromCharCode(sharp2) === String.fromCharCode(MESSAGE_HEADER_BYTE)
  ) {
    return true;
  }

  return false;
}

export function createDeferred(arg, data) {
  let localResolve = () => {};
  let localReject = () => {};
  let id;

  const promise = new Promise(async (resolve, reject) => {
    localResolve = resolve;
    localReject = reject;

    if (typeof arg === 'function') {
      try {
        await arg();
      } catch (error) {
        reject(error);
      }
    }
    if (typeof arg === 'string') id = arg;
  });

  return {
    id,
    data,
    resolve: localResolve,
    reject: localReject,
    promise,
  };
}
