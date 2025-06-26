import { useState } from 'react';
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize, X } from 'lucide-react';
import { Button } from '../ui/Button';

const customNodeStyles = {
  width: 200,
  height: 'auto',
  minHeight: 60,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '500',
  border: '1px solid hsl(var(--border) / 0.7)',
  textAlign: 'center' as const,
  padding: '10px 15px',
  whiteSpace: 'pre-wrap' as const,
};

const CustomNode = ({ data }: NodeProps) => (
  <div
    style={{
      ...customNodeStyles,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      background: (data as any).backgroundColor,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      color: (data as any).color,
    }}
  >
    <Handle
      type="target"
      position={Position.Top}
      isConnectable={false}
      style={{ visibility: 'hidden' }}
    />
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    {(data as any).label}
    <Handle
      type="source"
      position={Position.Bottom}
      isConnectable={false}
      style={{ visibility: 'hidden' }}
    />
  </div>
);

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  // Applications
  {
    id: 'webapp',
    type: 'custom',
    position: { x: 50, y: 50 },
    data: {
      label: 'Application\n(Web / Desktop)',
      backgroundColor: 'hsl(var(--primary) / 0.8)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  {
    id: 'mobileapp',
    type: 'custom',
    position: { x: 350, y: 50 },
    data: {
      label: 'Application\n(React Native)',
      backgroundColor: 'hsl(var(--primary) / 0.8)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  {
    id: 'nativeapp',
    type: 'custom',
    position: { x: 650, y: 50 },
    data: {
      label: 'Application\n(Native Mobile / Node.js)',
      backgroundColor: 'hsl(var(--primary) / 0.8)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  // SDK Abstraction
  {
    id: 'websdk',
    type: 'custom',
    position: { x: 50, y: 160 },
    data: {
      label: '@onekeyfe/hd-web-sdk\n(For Web & Desktop Apps)',
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  {
    id: 'blesdk',
    type: 'custom',
    position: { x: 350, y: 160 },
    data: {
      label: '@onekeyfe/hd-ble-sdk\n(For React Native Apps)',
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  {
    id: 'nodesdk',
    type: 'custom',
    position: { x: 650, y: 160 },
    data: {
      label: '@onekeyfe/hd-common-connect-sdk\n(For Node.js & Native Mobile)',
      backgroundColor: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  // Low-level Transports
  {
    id: 'webusb',
    type: 'custom',
    position: { x: -50, y: 300 },
    data: {
      label: 'WebUSB\n(Direct in Chrome/Edge)',
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
    },
  },
  {
    id: 'http',
    type: 'custom',
    position: { x: 150, y: 300 },
    data: {
      label: 'JSBridge\n(High Compatibility)',
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
    },
  },
  {
    id: 'ble',
    type: 'custom',
    position: { x: 410, y: 300 },
    data: {
      label: 'Bluetooth (BLE)\n(For Mobile)',
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
    },
  },
  {
    id: 'hid',
    type: 'custom',
    position: { x: 650, y: 300 },
    data: {
      label: 'HID\n(For Node.js USB)',
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
    },
  },
  // Hardware
  {
    id: 'device',
    type: 'custom',
    position: { x: 350, y: 420 },
    data: {
      label: 'OneKey Hardware',
      backgroundColor: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
    },
  },
];

const edgeStyle = { stroke: 'hsl(var(--border))', strokeWidth: 1.5 };
const initialEdges: Edge[] = [
  // App -> SDK
  { id: 'e-webapp-websdk', source: 'webapp', target: 'websdk', style: edgeStyle },
  { id: 'e-mobileapp-blesdk', source: 'mobileapp', target: 'blesdk', style: edgeStyle },
  { id: 'e-nativeapp-nodesdk', source: 'nativeapp', target: 'nodesdk', style: edgeStyle },

  // SDK -> Transports
  { id: 'e-websdk-webusb', source: 'websdk', target: 'webusb', style: edgeStyle },
  { id: 'e-websdk-http', source: 'websdk', target: 'http', style: edgeStyle },
  { id: 'e-blesdk-ble', source: 'blesdk', target: 'ble', style: edgeStyle },
  { id: 'e-nodesdk-ble', source: 'nodesdk', target: 'ble', style: edgeStyle },
  { id: 'e-nodesdk-hid', source: 'nodesdk', target: 'hid', style: edgeStyle },

  // Transports -> Device
  { id: 'e-webusb-device', source: 'webusb', target: 'device', style: edgeStyle },
  { id: 'e-http-device', source: 'http', target: 'device', style: edgeStyle },
  { id: 'e-ble-device', source: 'ble', target: 'device', style: edgeStyle },
  { id: 'e-hid-device', source: 'hid', target: 'device', style: edgeStyle },
];

export default function ArchitectureDiagram() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const flowProps = {
    defaultNodes: initialNodes,
    defaultEdges: initialEdges,
    nodeTypes,
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: false,
    fitView: true,
    proOptions: { hideAttribution: true },
    panOnDrag: false,
    zoomOnScroll: false,
    zoomOnPinch: false,
  };

  return (
    <>
      <div className="relative w-full h-[450px] bg-muted/30 border border-border/50 rounded-lg not-prose overflow-hidden">
        <ReactFlow {...flowProps}>
          <Background />
        </ReactFlow>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={() => setIsModalOpen(true)}
          aria-label="Maximize diagram"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
          onKeyDown={e => e.key === 'Escape' && setIsModalOpen(false)}
          role="button"
          tabIndex={0}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] bg-background border rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="presentation"
          >
            <ReactFlow {...flowProps} fitView>
              <Background />
            </ReactFlow>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-9 w-9 bg-background/80 hover:bg-muted"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close maximized view"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
