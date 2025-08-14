import { CoreMessage } from '../events';
import { createLogMessage, LOG } from '../events/log';

type LogMessage = {
  level: string;
  prefix: string;
  message: any[];
  timestamp: number;
};

const MAX_ENTRIES = 500;

let postMessage: (message: CoreMessage) => void;

class Log {
  prefix: string;

  enabled: boolean;

  messages: LogMessage[];

  constructor(prefix: string, enabled: boolean) {
    this.prefix = prefix;
    this.enabled = enabled;
    this.messages = [];
  }

  addMessage(level: string, prefix: string, ...args: any[]) {
    this.messages.push({
      level,
      prefix,
      message: args,
      timestamp: new Date().getTime(),
    });
    if (this.messages.length > MAX_ENTRIES) {
      this.messages.shift();
    }
  }

  log(...args: any[]) {
    this.addMessage('log', this.prefix, ...args);
    sendLogMessage(this.prefix, ...args);
    if (!this.enabled) {
      return;
    }
    console.log(this.prefix, ...args);
  }

  error(...args: any[]) {
    this.addMessage('error', this.prefix, ...args);
    sendLogMessage(this.prefix, ...args);
    if (!this.enabled) {
      return;
    }
    console.error(this.prefix, ...args);
  }

  warn(...args: any[]) {
    this.addMessage('warn', this.prefix, ...args);
    sendLogMessage(this.prefix, ...args);
    if (!this.enabled) {
      return;
    }
    console.warn(this.prefix, ...args);
  }

  debug(...args: any[]) {
    this.addMessage('debug', this.prefix, ...args);
    sendLogMessage(this.prefix, ...args);
    if (!this.enabled) {
      return;
    }
    console.log(this.prefix, ...args);
  }
}

const _logs: { [k: string]: Log } = {};

export const initLog = (prefix: string, enabled?: boolean) => {
  const instance = new Log(prefix, !!enabled);
  _logs[prefix] = instance;
  return instance;
};

export const enableLog = (enabled?: boolean) => {
  Object.keys(_logs).forEach(key => {
    _logs[key].enabled = !!enabled;
  });
};

export const enableLogByPrefix = (prefix: string, enabled: boolean) => {
  if (_logs[prefix]) {
    _logs[prefix].enabled = enabled;
  }
};

export const getLog = () => {
  let logs: LogMessage[] = [];
  Object.keys(_logs).forEach(key => {
    logs = logs.concat(_logs[key].messages);
  });
  logs.sort((a, b) => a.timestamp - b.timestamp);
  return logs;
};

export const setLoggerPostMessage = (postMessageFn: (message: CoreMessage) => void) => {
  postMessage = postMessageFn;
};

const serializeLog = (...args: any[]) =>
  args.map(arg => {
    if (typeof arg === 'string') {
      return arg;
    }
    if (typeof arg === 'number') {
      return arg;
    }
    if (typeof arg === 'boolean') {
      return arg;
    }
    if (typeof arg === 'undefined') {
      return arg;
    }
    if (typeof arg === 'object') {
      return JSON.stringify(arg, getCircularReplacer());
    }
    return arg;
  });

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

const sendLogMessage = (prefix: string, ...args: any[]) => {
  postMessage?.(createLogMessage(LOG.OUTPUT, serializeLog(prefix, ...args)));
};

export enum LoggerNames {
  Core = '@onekey/hd-core',
  Transport = 'Transport',
  Device = 'Device',
  DeviceCommands = 'DeviceCommands',
  DeviceConnector = 'DeviceConnector',
  DeviceList = 'DeviceList',
  DevicePool = 'DevicePool',
  HdCommonConnectSdk = '@onekey/common-connect-sdk',
  HdBleSdk = '@onekey/hd-ble-sdk',
  HdTransportHttp = '@onekey/hd-transport-http',
  HdTransportLowLevel = '@onekey/hd-transport-lowlevel',
  HdBleTransport = '@onekey/hd-ble-transport',
  HdWebBleTransport = '@onekey/hd-web-ble-transport',
  Connect = '@onekey/connect',
  Iframe = 'IFrame',
  SendMessage = '[SendMessage]',
  Method = '[Method]',
}

export const LoggerMap = {
  [LoggerNames.Core]: initLog(LoggerNames.Core),
  [LoggerNames.Transport]: initLog(LoggerNames.Transport),
  [LoggerNames.Device]: initLog(LoggerNames.Device),
  [LoggerNames.DeviceCommands]: initLog(LoggerNames.DeviceCommands),
  [LoggerNames.DeviceConnector]: initLog(LoggerNames.DeviceConnector),
  [LoggerNames.DeviceList]: initLog(LoggerNames.DeviceList),
  [LoggerNames.DevicePool]: initLog(LoggerNames.DevicePool),
  [LoggerNames.HdBleSdk]: initLog(LoggerNames.HdBleSdk),
  [LoggerNames.HdTransportHttp]: initLog(LoggerNames.HdTransportHttp),
  [LoggerNames.HdBleTransport]: initLog(LoggerNames.HdBleTransport),
  [LoggerNames.HdWebBleTransport]: initLog(LoggerNames.HdWebBleTransport),
  [LoggerNames.HdTransportLowLevel]: initLog(LoggerNames.HdTransportLowLevel),
  [LoggerNames.Connect]: initLog(LoggerNames.Connect),
  [LoggerNames.Iframe]: initLog(LoggerNames.Iframe),
  [LoggerNames.SendMessage]: initLog(LoggerNames.SendMessage),
  [LoggerNames.Method]: initLog(LoggerNames.Method),
  [LoggerNames.HdCommonConnectSdk]: initLog(LoggerNames.Method),
};

export const getLogger = (key: LoggerNames) => LoggerMap[key];
