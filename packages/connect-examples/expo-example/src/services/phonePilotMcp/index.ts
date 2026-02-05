/**
 * PhonePilot MCP Client
 *
 * Provides communication with PhonePilot MCP Server for mechanical arm control
 * and device preparation operations.
 */

import type {
  ConnectionState,
  HealthCheckResponse,
  ArmConnectResult,
  ArmDisconnectResult,
  ArmMoveResult,
  ArmClickResult,
  CaptureFrameResult,
  PrepareDeviceParams,
  PrepareDeviceResult,
  ActionResult,
} from './types';

/** Default PhonePilot server URL */
const DEFAULT_SERVER_URL = 'http://localhost:3847';

/** MCP JSON-RPC request ID counter */
let requestId = 0;

/**
 * PhonePilot MCP Client
 *
 * Communicates with PhonePilot via MCP Streamable HTTP transport.
 */
export class PhonePilotClient {
  private serverUrl: string;
  private sessionId: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private onStateChange?: (state: ConnectionState) => void;

  constructor(serverUrl: string = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  /**
   * Sets a callback for connection state changes
   */
  setOnStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Gets the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Updates connection state and notifies listeners
   */
  private updateState(state: ConnectionState): void {
    this.connectionState = state;
    this.onStateChange?.(state);
  }

  /**
   * Parses SSE (Server-Sent Events) response format
   */
  private parseSSEResponse(sseText: string): { result?: unknown; error?: { message: string } } {
    // SSE format:
    // event: message
    // data: {"jsonrpc":"2.0","id":1,"result":{...}}
    //
    // event: endpoint
    // ...

    const lines = sseText.trim().split('\n');
    let jsonData = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('data: ')) {
        jsonData = line.substring(6); // Remove "data: " prefix
        break;
      }
    }

    if (!jsonData) {
      return { error: { message: 'No data field in SSE response' } };
    }

    try {
      return JSON.parse(jsonData);
    } catch (error) {
      return { error: { message: `Failed to parse SSE data: ${error}` } };
    }
  }

  /**
   * Performs a health check on the PhonePilot server
   */
  async healthCheck(): Promise<HealthCheckResponse | null> {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('PhonePilot health check failed:', error);
      return null;
    }
  }

  /**
   * Connects to the PhonePilot MCP server
   */
  async connect(): Promise<boolean> {
    this.updateState('connecting');

    try {
      // Initialize MCP session
      const initRequest = {
        jsonrpc: '2.0',
        id: ++requestId,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'expo-example-automation',
            version: '1.0.0',
          },
        },
      };

      const response = await fetch(`${this.serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(initRequest),
      });

      if (!response.ok) {
        throw new Error(`MCP connection failed: ${response.status}`);
      }

      // Get session ID from response header
      this.sessionId = response.headers.get('mcp-session-id');

      // Send initialized notification
      await this.sendNotification('notifications/initialized', {});

      this.updateState('connected');
      console.log('PhonePilot MCP connected, session:', this.sessionId?.slice(0, 8));
      return true;
    } catch (error) {
      console.error('PhonePilot MCP connection failed:', error);
      this.updateState('error');
      return false;
    }
  }

  /**
   * Disconnects from the PhonePilot MCP server
   */
  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(`${this.serverUrl}/mcp`, {
          method: 'DELETE',
          headers: {
            'mcp-session-id': this.sessionId,
          },
        });
      } catch (error) {
        console.error('PhonePilot MCP disconnect error:', error);
      }
      this.sessionId = null;
    }
    this.updateState('disconnected');
  }

  /**
   * Sends an MCP request and returns the result
   */
  private async sendRequest<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.sessionId) {
      throw new Error('Not connected to PhonePilot MCP');
    }

    const request = {
      jsonrpc: '2.0',
      id: ++requestId,
      method,
      params,
    };

    const response = await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': this.sessionId,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status}`);
    }

    // Check Content-Type to determine response format
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      // SSE stream response - parse SSE format
      const text = await response.text();
      const result = this.parseSSEResponse(text);

      if (result.error) {
        throw new Error(result.error.message || 'MCP request error');
      }

      return result.result as T;
    } else {
      // Direct JSON response
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'MCP request error');
      }

      return result.result as T;
    }
  }

  /**
   * Sends an MCP notification (no response expected)
   */
  private async sendNotification(method: string, params: Record<string, unknown> = {}): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': this.sessionId,
      },
      body: JSON.stringify(notification),
    });
  }

  /**
   * Calls an MCP tool and parses the response
   */
  private async callTool<T>(toolName: string, args: Record<string, unknown> = {}): Promise<T> {
    const result = await this.sendRequest<{
      content: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
      }>;
    }>('tools/call', {
      name: toolName,
      arguments: args,
    });

    // Parse the text content as JSON
    const textContent = result.content.find((c) => c.type === 'text');
    if (textContent?.text) {
      return JSON.parse(textContent.text) as T;
    }

    throw new Error(`Tool ${toolName} returned no text content`);
  }

  /**
   * Calls an MCP tool and returns both parsed result and optional image
   */
  private async callToolWithImage<T>(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<{ result: T; frame?: string }> {
    const response = await this.sendRequest<{
      content: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
      }>;
    }>('tools/call', {
      name: toolName,
      arguments: args,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const imageContent = response.content.find((c) => c.type === 'image');

    if (!textContent?.text) {
      throw new Error(`Tool ${toolName} returned no text content`);
    }

    return {
      result: JSON.parse(textContent.text) as T,
      frame: imageContent?.data,
    };
  }

  // ============================================================================
  // Arm Control Methods
  // ============================================================================

  /**
   * Connects to the mechanical arm controller
   */
  async armConnect(): Promise<ArmConnectResult> {
    return this.callTool<ArmConnectResult>('arm-connect', {});
  }

  /**
   * Disconnects from the mechanical arm controller
   */
  async armDisconnect(): Promise<ArmDisconnectResult> {
    return this.callTool<ArmDisconnectResult>('arm-disconnect', {});
  }

  /**
   * Moves the arm to the specified position
   */
  async armMove(x: number, y: number, captureFrame = false): Promise<ArmMoveResult> {
    const { result, frame } = await this.callToolWithImage<ArmMoveResult>('arm-move', {
      x,
      y,
      captureFrame,
    });
    return { ...result, frame };
  }

  /**
   * Performs a click at the current position
   */
  async armClick(depth = 12, captureFrame = false): Promise<ArmClickResult> {
    const { result, frame } = await this.callToolWithImage<ArmClickResult>('arm-click', {
      depth,
      captureFrame,
    });
    return { ...result, frame };
  }

  /**
   * Captures the current camera frame
   */
  async captureFrame(): Promise<CaptureFrameResult> {
    const { result, frame } = await this.callToolWithImage<CaptureFrameResult>('capture-frame', {});
    return { ...result, frame };
  }

  // ============================================================================
  // High-Level Device Operations
  // ============================================================================

  /**
   * Taps at a specific screen coordinate
   */
  async tapAt(x: number, y: number): Promise<void> {
    await this.armMove(x, y);
    await this.armClick();
  }

  /**
   * Prepares the device with specified mnemonic/configuration
   *
   * This calls the PhonePilot prepare-device tool which handles:
   * - Device reset/wipe
   * - Mnemonic recovery
   * - PIN setup
   * - All physical operations
   */
  async prepareDevice(params: PrepareDeviceParams): Promise<PrepareDeviceResult> {
    return this.callTool<PrepareDeviceResult>('prepare-device', params as unknown as Record<string, unknown>);
  }

  /**
   * Performs a confirm action on the device
   */
  async confirmAction(): Promise<ActionResult> {
    return this.callTool<ActionResult>('confirm-action', { action: 'confirm' });
  }

  /**
   * Performs a cancel action on the device
   */
  async cancelAction(): Promise<ActionResult> {
    return this.callTool<ActionResult>('confirm-action', { action: 'cancel' });
  }

  /**
   * Inputs a PIN on the device
   */
  async inputPin(pin: string): Promise<ActionResult> {
    return this.callTool<ActionResult>('input-pin', { pin });
  }

  /**
   * Executes a predefined auto operation sequence
   * @param sequenceId The sequence ID from PhonePilot (e.g., 'one-normal-24', 'reset-wallet')
   */
  async executeSequence(sequenceId: string): Promise<ActionResult> {
    return this.callTool<ActionResult>('execute-sequence', { sequenceId });
  }

  /**
   * Stops the currently running sequence
   */
  async stopSequence(): Promise<ActionResult> {
    return this.callTool<ActionResult>('stop-sequence', {});
  }
}

// Export singleton instance
export const phonePilotClient = new PhonePilotClient();

// Re-export types
export * from './types';
