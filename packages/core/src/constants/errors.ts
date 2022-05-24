export const ERROR_CODES = {
  // methods error
  Method_InvalidParameter: '',
  Call_API: '',

  // device error
  Transport_InvalidProtobuf: '',
  Device_FwException: '',
  Device_UnexpectedMode: '',
  Device_CallInProgress: '',
  Device_InitializeFailed: '',
  Not_Use_Onekey_Device: 'Please use onekey device',

  // runtime error
  Runtime: '',

  // iframe error
  Init_IframeBlocked: 'Init_IframeBlocked',
  Init_IframeTimeout: 'Init_IframeTimeout',
  Init_AlreadyInitialized: 'Init_AlreadyInitialized',
};

export class OnekeyError extends Error {
  code: string;

  message: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.message = message;
  }
}

export const TypedError = (id: keyof typeof ERROR_CODES, message?: string) =>
  new OnekeyError(id, message || ERROR_CODES[id]);

// serialize Error/TypeError object into payload error type (Error object/class is converted to string while sent via postMessage)
export const serializeError = (payload: any) => {
  if (payload && payload.error instanceof Error) {
    return { error: payload.error.message, code: payload.error.code };
  }
  return payload;
};
