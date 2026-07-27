type LogMethod = (...args: unknown[]) => void;

type TransportLogger = {
  debug?: LogMethod;
  error?: LogMethod;
  warn?: LogMethod;
};

let activeLogger: TransportLogger | undefined;

export const setBleLogger = (logger?: TransportLogger) => {
  activeLogger = logger;
};

export const bleLogger = {
  debug: (...args: unknown[]) => activeLogger?.debug?.(...args),
  error: (...args: unknown[]) => activeLogger?.error?.(...args),
  warn: (...args: unknown[]) => activeLogger?.warn?.(...args),
};
