export declare const on: <T extends string, P extends (...args: any[]) => any>(
  type: T,
  fn: P
) => void;

export declare const off: (type: any, fn: any) => void;

export declare const removeAllListeners: (type: any) => void;
