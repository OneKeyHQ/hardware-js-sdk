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

// 定义类型，避免 any
interface CustomNodeData {
  label: string;
  backgroundColor: string;
  color: string;
  border?: string;
}

const CustomNode = ({ data }: NodeProps<CustomNodeData>) => (
  <div
    style={{
      ...customNodeStyles,
      background: data.backgroundColor,
      color: data.color,
      border: data.border || customNodeStyles.border,
    }}
  >
    <Handle
      type="target"
      position={Position.Top}
      isConnectable={false}
      style={{ visibility: 'hidden' }}
    />
    {data.label}
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
  // Application Layer
  {
    id: 'webapp',
    type: 'custom',
    position: { x: 60, y: 40 },
    data: {
      label: 'Web / Desktop App',
      backgroundColor: 'hsl(var(--primary) / 0.9)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  {
    id: 'rnapp',
    type: 'custom',
    position: { x: 320, y: 40 },
    data: {
      label: 'React Native App',
      backgroundColor: 'hsl(var(--primary) / 0.9)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  {
    id: 'nativeapp',
    type: 'custom',
    position: { x: 580, y: 40 },
    data: {
      label: 'Native Mobile App',
      backgroundColor: 'hsl(var(--primary) / 0.9)',
      color: 'hsl(var(--primary-foreground))',
    },
  },
  // SDK Layer
  {
    id: 'hd-web-sdk',
    type: 'custom',
    position: { x: 60, y: 140 },
    data: {
      label: '@onekeyfe/hd-web-sdk',
      backgroundColor: 'hsl(var(--secondary) / 0.95)',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  {
    id: 'hd-ble-sdk',
    type: 'custom',
    position: { x: 320, y: 140 },
    data: {
      label: '@onekeyfe/hd-ble-sdk',
      backgroundColor: 'hsl(var(--secondary) / 0.95)',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  {
    id: 'hd-common-connect-sdk',
    type: 'custom',
    position: { x: 580, y: 140 },
    data: {
      label: '@onekeyfe/hd-common-connect-sdk',
      backgroundColor: 'hsl(var(--secondary) / 0.95)',
      color: 'hsl(var(--secondary-foreground))',
    },
  },
  // Transport Layer
  {
    id: 'webusb',
    type: 'custom',
    position: { x: 0, y: 260 },
    data: {
      label: '@onekeyfe/hd-transport-webusb',
      backgroundColor: 'hsl(var(--amber) / 0.25)',
      color: 'hsl(var(--amber-foreground))',
    },
  },
  {
    id: 'http',
    type: 'custom',
    position: { x: 180, y: 260 },
    data: {
      label: '@onekeyfe/hd-transport-http',
      backgroundColor: 'hsl(var(--amber) / 0.25)',
      color: 'hsl(var(--amber-foreground))',
    },
  },
  {
    id: 'ble',
    type: 'custom',
    position: { x: 400, y: 260 },
    data: {
      label: '@onekeyfe/hd-transport-ble',
      backgroundColor: 'hsl(var(--amber) / 0.25)',
      color: 'hsl(var(--amber-foreground))',
    },
  },
  {
    id: 'lowlevel',
    type: 'custom',
    position: { x: 600, y: 260 },
    data: {
      label: '@onekeyfe/hd-transport-lowlevel',
      backgroundColor: 'hsl(var(--amber) / 0.25)',
      color: 'hsl(var(--amber-foreground))',
    },
  },
  // Protocol Layer
  {
    id: 'protobuf',
    type: 'custom',
    position: { x: 320, y: 350 },
    data: {
      label: 'Protobuf Protocol\n(unified message encoding/decoding)',
      backgroundColor: 'transparent',
      color: 'hsl(var(--muted-foreground))',
      border: '2px dashed hsl(var(--border) / 0.7)',
    },
  },
  // Hardware Layer
  {
    id: 'hardware',
    type: 'custom',
    position: { x: 320, y: 440 },
    data: {
      label: 'OneKey Hardware',
      backgroundColor: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
    },
  },
];

const edgeStyle = { stroke: 'hsl(var(--border))', strokeWidth: 1.5 };
const dashedEdgeStyle = { stroke: 'hsl(var(--border))', strokeWidth: 1.5, strokeDasharray: '6 4' };
const initialEdges: Edge[] = [
  // App -> SDK
  { id: 'e-webapp-websdk', source: 'webapp', target: 'hd-web-sdk', style: edgeStyle },
  { id: 'e-rnapp-ble', source: 'rnapp', target: 'hd-ble-sdk', style: edgeStyle },
  {
    id: 'e-nativeapp-common',
    source: 'nativeapp',
    target: 'hd-common-connect-sdk',
    style: edgeStyle,
  },
  // SDK -> Transport
  { id: 'e-websdk-webusb', source: 'hd-web-sdk', target: 'webusb', style: edgeStyle },
  { id: 'e-websdk-http', source: 'hd-web-sdk', target: 'http', style: edgeStyle },
  { id: 'e-blesdk-ble', source: 'hd-ble-sdk', target: 'ble', style: edgeStyle },
  { id: 'e-common-ble', source: 'hd-common-connect-sdk', target: 'ble', style: edgeStyle },
  { id: 'e-common-http', source: 'hd-common-connect-sdk', target: 'http', style: edgeStyle },
  {
    id: 'e-common-lowlevel',
    source: 'hd-common-connect-sdk',
    target: 'lowlevel',
    style: edgeStyle,
  },
  // Transport -> Protobuf
  { id: 'e-webusb-protobuf', source: 'webusb', target: 'protobuf', style: dashedEdgeStyle },
  { id: 'e-http-protobuf', source: 'http', target: 'protobuf', style: dashedEdgeStyle },
  { id: 'e-ble-protobuf', source: 'ble', target: 'protobuf', style: dashedEdgeStyle },
  { id: 'e-lowlevel-protobuf', source: 'lowlevel', target: 'protobuf', style: dashedEdgeStyle },
  // Protobuf -> Hardware
  { id: 'e-protobuf-hardware', source: 'protobuf', target: 'hardware', style: edgeStyle },
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
        <ReactFlow {...flowProps} />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={() => {
            window.open(
              window.location.href + '?diagram=fullscreen',
              '_blank',
              'width=1200,height=800'
            );
          }}
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
