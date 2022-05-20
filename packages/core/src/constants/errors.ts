export const ERROR_CODES = {
  Runtime: '',
};

export class OneKeyError extends Error {
  code: string;

  message: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.message = message;
  }
}

export const TypedError = (id: keyof typeof ERROR_CODES, message?: string) =>
  new OneKeyError(id, message || ERROR_CODES[id]);

// serialize Error/TypeError object into payload error type (Error object/class is converted to string while sent via postMessage)
export const serializeError = (payload: any) => {
  if (payload && payload.error instanceof Error) {
    return { error: payload.error.message, code: payload.error.code };
  }
  return payload;
};
