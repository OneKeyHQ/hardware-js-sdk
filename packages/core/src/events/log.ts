import type { MessageFactoryFn } from './utils';

export const LOG_EVENT = 'LOG_EVENT';

export const LOG = {
  OUTPUT: 'log-output',
} as const;

export interface LogOutput {
  type: typeof LOG.OUTPUT;
  payload: any;
}

export type LogEvent = LogOutput;

export type LogEventMessage = LogEvent & { event: typeof LOG_EVENT };

export const createLogMessage: MessageFactoryFn<typeof LOG_EVENT, LogEvent> = (type, payload) =>
  ({
    event: LOG_EVENT,
    type,
    payload,
  } as any);
