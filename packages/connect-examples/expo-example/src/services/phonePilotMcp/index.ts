/**
 * PhonePilot MCP Client
 *
 * 提供与 PhonePilot MCP Server 的连接、机械臂控制、截图与序列执行能力。
 */

import type {
  ActionResult,
  ArmClickResult,
  ArmConnectResult,
  ArmDisconnectResult,
  ArmMoveResult,
  CaptureFrameResult,
  ConnectionState,
  ExecuteSequenceResult,
  HealthCheckResponse,
  MnemonicStoreResult,
} from './types';

/** PhonePilot 默认服务地址 */
const DEFAULT_SERVER_URL = 'http://localhost:3847';

/** 默认请求超时（30 秒） */
const DEFAULT_TIMEOUT_MS = 30_000;

/** 长时间操作超时（5 分钟，用于 executeSequence 等） */
const LONG_TIMEOUT_MS = 300_000;

/**
 * 带超时的 fetch 封装
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/**
 * PhonePilot MCP 客户端
 *
 * 通过 MCP Streamable HTTP transport 与 PhonePilot 通信。
 */
export class PhonePilotClient {
  private serverUrl: string;

  private sessionId: string | null = null;

  private connectionState: ConnectionState = 'disconnected';

  private onStateChange?: (state: ConnectionState) => void;

  private requestId = 0;

  constructor(serverUrl: string = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  setOnStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(state: ConnectionState): void {
    this.connectionState = state;
    this.onStateChange?.(state);
  }

  private parseSSEResponse(sseText: string): { result?: unknown; error?: { message: string } } {
    const lines = sseText.trim().split('\n');
    const dataLines: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('data: ')) {
        dataLines.push(line.substring(6));
      }
    }

    if (dataLines.length === 0) {
      return { error: { message: 'No data field in SSE response' } };
    }

    const jsonData = dataLines.join('\n');

    try {
      return JSON.parse(jsonData);
    } catch (error) {
      return { error: { message: `Failed to parse SSE data: ${error}` } };
    }
  }

  async healthCheck(): Promise<HealthCheckResponse | null> {
    try {
      const response = await fetchWithTimeout(
        `${this.serverUrl}/health`,
        {},
        DEFAULT_TIMEOUT_MS
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('PhonePilot health check failed:', error);
      return null;
    }
  }

  async connect(): Promise<boolean> {
    this.updateState('connecting');

    try {
      this.requestId += 1;
      const initRequest = {
        jsonrpc: '2.0',
        id: this.requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'expo-example-automation',
            version: '2.0.0',
          },
        },
      };

      const response = await fetchWithTimeout(
        `${this.serverUrl}/mcp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify(initRequest),
        },
        DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        throw new Error(`MCP connection failed: ${response.status}`);
      }

      this.sessionId = response.headers.get('mcp-session-id');
      if (!this.sessionId) {
        throw new Error('MCP connection succeeded but mcp-session-id header is missing');
      }
      await this.sendNotification('notifications/initialized', {});

      this.updateState('connected');
      return true;
    } catch (error) {
      this.sessionId = null;
      console.error('PhonePilot MCP connection failed:', error);
      this.updateState('error');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetchWithTimeout(
          `${this.serverUrl}/mcp`,
          {
            method: 'DELETE',
            headers: {
              'mcp-session-id': this.sessionId,
            },
          },
          DEFAULT_TIMEOUT_MS
        );
      } catch (error) {
        console.error('PhonePilot MCP disconnect error:', error);
      }
      this.sessionId = null;
    }
    this.updateState('disconnected');
  }

  private async sendRequest<T>(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    if (!this.sessionId) {
      throw new Error('Not connected to PhonePilot MCP');
    }

    this.requestId += 1;
    const request = {
      jsonrpc: '2.0',
      id: this.requestId,
      method,
      params,
    };

    const response = await fetchWithTimeout(
      `${this.serverUrl}/mcp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': this.sessionId,
        },
        body: JSON.stringify(request),
      },
      timeoutMs
    );

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const text = await response.text();
      const result = this.parseSSEResponse(text);
      if (result.error) {
        throw new Error(result.error.message || 'MCP request error');
      }
      return result.result as T;
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || 'MCP request error');
    }

    return result.result as T;
  }

  private async sendNotification(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    try {
      const response = await fetchWithTimeout(
        `${this.serverUrl}/mcp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'mcp-session-id': this.sessionId,
          },
          body: JSON.stringify(notification),
        },
        DEFAULT_TIMEOUT_MS
      );

      if (!response.ok) {
        console.warn(`PhonePilot notification ${method} failed: ${response.status}`);
      }
    } catch (error) {
      console.warn(`PhonePilot notification ${method} error:`, error);
    }
  }

  private async callTool<T>(
    toolName: string,
    args: Record<string, unknown> = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const result = await this.sendRequest<{
      content: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
      }>;
    }>('tools/call', { name: toolName, arguments: args }, timeoutMs);

    const textContent = result.content.find(c => c.type === 'text');
    if (textContent?.text) {
      try {
        return JSON.parse(textContent.text) as T;
      } catch (error) {
        throw new Error(
          `Failed to parse tool ${toolName} response: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    throw new Error(`Tool ${toolName} returned no text content`);
  }

  private async callToolWithImage<T>(
    toolName: string,
    args: Record<string, unknown> = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<{ result: T; frame?: string }> {
    const response = await this.sendRequest<{
      content: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
      }>;
    }>('tools/call', { name: toolName, arguments: args }, timeoutMs);

    const textContent = response.content.find(c => c.type === 'text');
    const imageContent = response.content.find(c => c.type === 'image');

    if (!textContent?.text) {
      throw new Error(`Tool ${toolName} returned no text content`);
    }

    try {
      return {
        result: JSON.parse(textContent.text) as T,
        frame: imageContent?.data,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse tool ${toolName} response: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  async armConnect(): Promise<ArmConnectResult> {
    return this.callTool<ArmConnectResult>('arm-connect', {});
  }

  async armDisconnect(): Promise<ArmDisconnectResult> {
    return this.callTool<ArmDisconnectResult>('arm-disconnect', {});
  }

  async armMove(x: number, y: number, captureFrame = false): Promise<ArmMoveResult> {
    const { result, frame } = await this.callToolWithImage<ArmMoveResult>('arm-move', {
      x,
      y,
      captureFrame,
    });
    return { ...result, frame };
  }

  async armClick(depth = 12, captureFrame = false): Promise<ArmClickResult> {
    const { result, frame } = await this.callToolWithImage<ArmClickResult>('arm-click', {
      depth,
      captureFrame,
    });
    return { ...result, frame };
  }

  async captureFrame(): Promise<CaptureFrameResult> {
    const { result, frame } = await this.callToolWithImage<CaptureFrameResult>('capture-frame', {});
    return { ...result, frame };
  }

  async tapAt(x: number, y: number): Promise<void> {
    await this.armMove(x, y);
    await this.armClick();
  }

  async confirmAction(): Promise<ActionResult> {
    return this.callTool<ActionResult>('confirm-action', { action: 'confirm' });
  }

  async cancelAction(): Promise<ActionResult> {
    return this.callTool<ActionResult>('confirm-action', { action: 'cancel' });
  }

  async inputPin(pin: string): Promise<ActionResult> {
    return this.callTool<ActionResult>('input-pin', { pin });
  }

  async executeSequence(sequenceId: string): Promise<ExecuteSequenceResult> {
    const { result, frame } = await this.callToolWithImage<ExecuteSequenceResult>(
      'execute-sequence',
      { sequenceId },
      LONG_TIMEOUT_MS
    );
    return {
      ...result,
      frame,
    };
  }

  async stopSequence(): Promise<ActionResult> {
    return this.callTool<ActionResult>('stop-sequence', {});
  }

  async mnemonicStoreGet(): Promise<MnemonicStoreResult> {
    return this.callTool<MnemonicStoreResult>('mnemonic-store', { action: 'get' });
  }

  async mnemonicStoreStatus(): Promise<MnemonicStoreResult> {
    return this.callTool<MnemonicStoreResult>('mnemonic-store', { action: 'status' });
  }

  async mnemonicStoreClear(): Promise<MnemonicStoreResult> {
    return this.callTool<MnemonicStoreResult>('mnemonic-store', { action: 'clear' });
  }
}

export * from './types';
