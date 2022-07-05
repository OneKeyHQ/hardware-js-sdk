export interface IHardwareError {
  errorCode: ValueOf<typeof HardwareErrorCode>;
  message: string;
}

type ValueOf<P extends object> = P[keyof P];

type HardwareErrorCodeMessageMapping = { [P in ValueOf<typeof HardwareErrorCode>]: string };

export class HardwareError extends Error {
  errorCode: ValueOf<typeof HardwareErrorCode> = HardwareErrorCode.UnknownError;

  message = '';

  constructor(
    hardwareError: IHardwareError | string,
    errorMessageMapping: HardwareErrorCodeMessageMapping
  ) {
    super();
    this.message = errorMessageMapping[HardwareErrorCode.UnknownError];

    if (typeof hardwareError === 'string') {
      this.errorCode = HardwareErrorCode.UnknownError;
      this.message = hardwareError;
    } else {
      const message = errorMessageMapping[hardwareError.errorCode];
      if (message) {
        this.message = fillStringWithArguments(message, hardwareError);
      }
      this.errorCode = hardwareError.errorCode;
    }

    this.name = 'HardwareError';
  }
}

export const HardwareErrorCode = {
  UnknownError: 0,
} as const;

function fillStringWithArguments(value: string, object: object) {
  return value.replace(/\{([^}]+)\}/g, (_, arg: string) => (object as unknown as any)[arg] || '?');
}
