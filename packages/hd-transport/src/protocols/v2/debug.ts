export type ProtocolV2DebugLogger = {
  debug?: (...args: unknown[]) => void;
};

export type ProtocolV2FrameDebugOptions = {
  logger?: ProtocolV2DebugLogger;
  logPrefix?: string;
  context?: string;
  messageName?: string;
  messageTypeId?: number;
  pbPayloadLength?: number;
};

export function logProtocolV2Debug(
  options: ProtocolV2FrameDebugOptions | undefined,
  stage: string,
  details: Record<string, unknown>
) {
  options?.logger?.debug?.(`[${options.logPrefix ?? 'ProtocolV2'}] ${stage}`, {
    ...(options.context ? { context: options.context } : {}),
    ...(options.messageName ? { messageName: options.messageName } : {}),
    ...(options.messageTypeId !== undefined ? { messageTypeId: options.messageTypeId } : {}),
    ...(options.pbPayloadLength !== undefined ? { pbPayloadLength: options.pbPayloadLength } : {}),
    ...details,
  });
}
