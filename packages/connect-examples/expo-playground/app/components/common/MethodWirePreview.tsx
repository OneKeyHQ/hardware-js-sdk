import React, { useMemo } from 'react';
import { ArrowRightLeft, CheckCircle2, Send } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import type { UnifiedMethodConfig } from '../../data/types';

type WirePreviewInfo = {
  send: string;
  expected: string;
  flow?: string;
};

const METHOD_WIRE_PREVIEW: Record<string, WirePreviewInfo> = {
  evmGetAddress: {
    send: 'EthereumGetAddressOneKey',
    expected: 'EthereumAddressOneKey',
  },
  evmGetPublicKey: {
    send: 'EthereumGetPublicKeyOneKey',
    expected: 'EthereumPublicKeyOneKey',
  },
  evmSignMessage: {
    send: 'EthereumSignMessageOneKey',
    expected: 'EthereumMessageSignatureOneKey',
  },
  evmSignTypedData: {
    send: 'EthereumSignTypedHashOneKey',
    expected: 'EthereumTypedDataSignatureOneKey',
  },
  evmSignTransaction: {
    send: 'EthereumSignTxOneKey',
    expected: 'EthereumTxRequestOneKey / EthereumSignedTx',
    flow: 'multi-step',
  },
  btcGetAddress: {
    send: 'GetAddress',
    expected: 'Address',
  },
  btcGetPublicKey: {
    send: 'GetPublicKey',
    expected: 'PublicKey',
  },
  btcSignMessage: {
    send: 'SignMessage',
    expected: 'MessageSignature',
  },
  btcSignPsbt: {
    send: 'SignPsbt',
    expected: 'SignedPsbt',
  },
  btcSignTransaction: {
    send: 'SignTx',
    expected: 'TxRequest / SignedTx',
    flow: 'multi-step',
  },
  solGetAddress: {
    send: 'SolanaGetAddress',
    expected: 'SolanaAddress',
  },
  solSignTransaction: {
    send: 'SolanaSignTx',
    expected: 'SolanaSignedTx',
  },
  stellarGetAddress: {
    send: 'StellarGetAddress',
    expected: 'StellarAddress',
  },
  stellarSignTransaction: {
    send: 'StellarSignTx',
    expected: 'StellarTxOpRequest / StellarSignedTx',
    flow: 'multi-step',
  },
};

const COMMON_PARAMETER_NAMES = new Set([
  'connectId',
  'deviceId',
  'passphraseState',
  'useEmptyPassphrase',
  'deriveCardano',
  'skipPassphraseCheck',
]);

function toHardened(index: number) {
  return index + 0x80000000;
}

function parsePath(path: string) {
  return path
    .replace(/^m\//, '')
    .split('/')
    .filter(Boolean)
    .map(part => {
      const hardened = /['hH]$/.test(part);
      const value = Number(part.replace(/['hH]$/, ''));
      if (!Number.isFinite(value)) return part;
      return hardened ? toHardened(value) : value;
    });
}

function normalizeWireValue(key: string, value: unknown): [string, unknown] | null {
  if (COMMON_PARAMETER_NAMES.has(key)) {
    return null;
  }

  if (key === 'path' && typeof value === 'string') {
    return ['address_n', parsePath(value)];
  }

  if (key === 'showOnOneKey') {
    return ['show_display', value];
  }

  if (key === 'chainId') {
    return ['chain_id', value];
  }

  if (key === 'messageHex') {
    return ['message', value];
  }

  if (key === 'rawTx') {
    return ['raw_tx', value];
  }

  return [key, value];
}

function normalizeSingleWirePayload(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => normalizeWireValue(key, value))
      .filter((entry): entry is [string, unknown] => Boolean(entry))
  );
}

function normalizeWirePayload(params: Record<string, unknown>) {
  if (Array.isArray(params.bundle)) {
    return {
      bundle: params.bundle.map(item =>
        item && typeof item === 'object'
          ? normalizeSingleWirePayload(item as Record<string, unknown>)
          : item
      ),
    };
  }

  return normalizeSingleWirePayload(params);
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

interface MethodWirePreviewProps {
  methodConfig: UnifiedMethodConfig;
  requestData: Record<string, unknown>;
}

const MethodWirePreview: React.FC<MethodWirePreviewProps> = ({ methodConfig, requestData }) => {
  const wireInfo = METHOD_WIRE_PREVIEW[methodConfig.method] ?? {
    send: methodConfig.method,
    expected: 'See decoded response log',
  };
  const wirePayload = useMemo(() => normalizeWirePayload(requestData), [requestData]);

  return (
    <Card className="mb-2 flex-shrink-0 border border-border/50 bg-card shadow-sm">
      <CardContent className="p-3">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Protocol preview</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {methodConfig.method}
              </div>
            </div>
          </div>
          {wireInfo.flow && (
            <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {wireInfo.flow}
            </span>
          )}
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(150px,0.5fr)_minmax(150px,0.5fr)_minmax(260px,1fr)]">
          <div className="rounded-md border border-border/70 bg-background p-2">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Send className="h-3 w-3" />
              Send
            </div>
            <div className="break-words font-mono text-xs font-semibold text-foreground">
              {wireInfo.send}
            </div>
          </div>

          <div className="rounded-md border border-border/70 bg-background p-2">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Expected
            </div>
            <div className="break-words font-mono text-xs font-semibold text-foreground">
              {wireInfo.expected}
            </div>
          </div>

          <details open className="rounded-md border border-border/70 bg-background p-2 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Wire payload preview
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {formatJson(wirePayload)}
            </pre>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};

export default MethodWirePreview;
