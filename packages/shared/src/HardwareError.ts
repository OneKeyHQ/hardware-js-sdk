export interface IHardwareError {
  errorCode: ValueOf<typeof HardwareErrorCode>;
  message?: string;
}

type ValueOf<P extends object> = P[keyof P];

type HardwareErrorCodeMessageMapping = { [P in ValueOf<typeof HardwareErrorCode>]: string };

type ErrorCodeUnion = ValueOf<typeof HardwareErrorCode>;

function fillStringWithArguments(value: string, object: object) {
  return value.replace(/\{([^}]+)\}/g, (_, arg: string) => (object as unknown as any)[arg] || '?');
}

export class HardwareError extends Error {
  errorCode: ErrorCodeUnion = HardwareErrorCode.UnknownError;

  message = '';

  constructor(hardwareError: IHardwareError | string) {
    super();
    const errorMessageMapping = HardwareErrorCodeMessage;
    this.message = errorMessageMapping[HardwareErrorCode.UnknownError];

    if (typeof hardwareError === 'string') {
      this.errorCode = HardwareErrorCode.UnknownError;
      this.message = hardwareError;
    } else {
      const message = (hardwareError.message || errorMessageMapping[hardwareError.errorCode]) ?? '';
      if (message) {
        this.message = fillStringWithArguments(message, hardwareError);
      }
      this.errorCode = hardwareError.errorCode;
    }

    this.name = 'HardwareError';
  }
}

export const HardwareErrorCode = {
  /**
   * This error can be thrown when unexpected error occurred and in most cases it is related to implementation bug.
   * Original message is available in message property.
   */
  UnknownError: 0,

  /**
   * Firmware version mismatch
   */
  DeviceFwException: 101,

  /**
   * Not initialized
   */
  NotInitialized: 200,

  /**
   * Iframe not initialized
   */
  IFrameNotInitialized: 300,

  /**
   * iframe repeat initialization
   */
  IFrameAleradyInitialized: 301,

  /**
   * iframe load failure
   */
  IFrameLoadFail: 302,

  /**
   * init iframe time out
   */
  IframeTimeout: 303,

  /**
   * iframe blocked
   */
  IframeBlocked: 304,

  /**
   * Runtime errors during method execution
   */
  CallMethodError: 400,

  /**
   * Method does not responding
   */
  CallMethodNotResponse: 404,

  /**
   * Netword request error
   */
  NetworkError: 500,

  /**
   * transport not configured
   */
  TransportNotConfigured: 600,
} as const;

export const HardwareErrorCodeMessage: HardwareErrorCodeMessageMapping = {
  [HardwareErrorCode.UnknownError]: 'Unknown error occurred. Check message property.',

  /**
   * Device Errors
   */
  [HardwareErrorCode.DeviceFwException]: 'Firmware version mismatch',

  /**
   * Node Errors
   */
  [HardwareErrorCode.NotInitialized]: 'Not initialized',
  /**
   * Iframe Errors
   */
  [HardwareErrorCode.IFrameNotInitialized]: 'IFrame not initialized',
  [HardwareErrorCode.IFrameAleradyInitialized]: 'IFrame alerady initialized',
  [HardwareErrorCode.IFrameLoadFail]: 'IFrame load fail',
  [HardwareErrorCode.IframeTimeout]: 'init iframe time out',
  [HardwareErrorCode.IframeBlocked]: 'IFrame blocked',

  /**
   * Method Errors
   */
  [HardwareErrorCode.CallMethodError]: 'Runtime errors during method execution',
  [HardwareErrorCode.CallMethodNotResponse]: 'Method does not responding',

  /**
   * Network Errors
   */
  [HardwareErrorCode.NetworkError]: 'Network request error',

  /**
   * Transport Errors
   */
  [HardwareErrorCode.TransportNotConfigured]: 'Transport not configured',
} as const;

export const TypedError = (hardwareError: ErrorCodeUnion | string, message?: string) => {
  if (typeof hardwareError === 'string') {
    return new HardwareError(hardwareError);
  }
  return new HardwareError({ errorCode: hardwareError, message: message ?? '' });
};

export const serializeError = (payload: any) => {
  if (payload && payload.error instanceof HardwareError) {
    return { error: payload.error.message, code: payload.error.errorCode };
  }
  if (payload && payload.error instanceof Error) {
    return { error: payload.error.message, code: payload.error.code };
  }
  return payload;
};
