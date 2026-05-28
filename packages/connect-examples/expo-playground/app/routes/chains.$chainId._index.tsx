import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getHDPath } from '@onekeyfe/hd-core';
import { ArrowRight, Layers, Loader2, Play, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { ChainBoundary } from '../components/common/ChainBoundary';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import ParameterInput from '../components/common/ParameterInput';
import { useMethodResolver } from '../hooks/useMethodResolver';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useHardwareStore, type CommonParametersState } from '../store/hardwareStore';
import { useDeviceStore } from '../store/deviceStore';
import { ChainIcon } from '../components/icons/ChainIcon';
import {
  getParameterDisplayValue,
  isLazyParameterValue,
  processParameters,
} from '../utils/parameterUtils';
import { cancelHardwareOperation } from '../services/hardwareService';
import { logHardware } from '../utils/logger';
import { formatJsonPreview } from '../utils/jsonPreview';
import { ProtocolExecutionLog } from '../components/common/MethodExecutor';
import type { MethodPreset, UnifiedMethodConfig } from '../data/types';

type InlineExecutionState = {
  status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled';
  request?: Record<string, unknown>;
  response?: unknown;
  error?: string;
  durationMs?: number;
};

const INLINE_LOG_STRING_LIMIT = 512;
const INLINE_LOG_ARRAY_LIMIT = 20;

const COMMON_PROTOCOL_FIELDS = new Set([
  'connectId',
  'deviceId',
  'passphraseState',
  'useEmptyPassphrase',
  'deriveCardano',
  'skipPassphraseCheck',
]);
const COMMON_PARAMETER_NAMES = new Set(['useEmptyPassphrase', 'passphraseState', 'deriveCardano']);

const TON_WIRE_INFO: Record<string, { tx: string; rx: string; decoded: string }> = {
  tonGetAddress: {
    tx: 'TonGetAddress (11901)',
    rx: 'TonAddress (11902)',
    decoded: 'TonAddress',
  },
  tonSignMessage: {
    tx: 'TonSignMessage (11903)',
    rx: 'TonSignedMessage (11904) / TonTxAck (11907)',
    decoded: 'TonSignedMessage',
  },
  tonSignProof: {
    tx: 'TonSignProof (11905)',
    rx: 'TonSignedProof (11906)',
    decoded: 'TonSignedProof',
  },
};

const TON_FIELD_MAP: Record<string, string> = {
  showOnOneKey: 'show_display',
  walletVersion: 'wallet_version',
  isBounceable: 'is_bounceable',
  isTestnetOnly: 'is_testnet_only',
  walletId: 'wallet_id',
  jettonMasterAddress: 'jetton_master_address',
  jettonWalletAddress: 'jetton_wallet_address',
  tonAmount: 'ton_amount',
  jettonAmount: 'jetton_amount',
  fwdFee: 'fwd_fee',
  isRawData: 'is_raw_data',
  expireAt: 'expire_at',
  extDestination: 'ext_destination',
  extTonAmount: 'ext_ton_amount',
  extPayload: 'ext_payload',
};

function cleanExecutionParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function omitCommonProtocolFields(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !COMMON_PROTOCOL_FIELDS.has(key))
  );
}

function cleanProtocolPayload(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function summarizeInlineLogValue(value: unknown, depth = 0): unknown {
  if (isLazyParameterValue(value)) {
    return summarizeInlineLogValue(getParameterDisplayValue(value), depth);
  }

  if (typeof value === 'bigint') return value.toString();
  if (value === undefined || value === null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > INLINE_LOG_STRING_LIMIT) {
      return `${value.slice(0, INLINE_LOG_STRING_LIMIT)}... (len=${value.length})`;
    }
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return `<ArrayBuffer ${value.byteLength} B>`;
  }

  if (ArrayBuffer.isView(value)) {
    return `<${value.constructor.name} ${value.byteLength} B>`;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const fileName = 'name' in value && typeof value.name === 'string' ? value.name : 'Blob';
    return `<${fileName} ${value.size} B>`;
  }

  if (Array.isArray(value)) {
    const items =
      value.length > INLINE_LOG_ARRAY_LIMIT ? value.slice(0, INLINE_LOG_ARRAY_LIMIT) : value;
    const summarized = items.map(item => summarizeInlineLogValue(item, depth + 1));
    return value.length > INLINE_LOG_ARRAY_LIMIT
      ? [...summarized, `... (${value.length - INLINE_LOG_ARRAY_LIMIT} more items)`]
      : summarized;
  }

  if (depth >= 6) {
    return '[Object]';
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      summarizeInlineLogValue(item, depth + 1),
    ])
  );
}

function getAddressN(params: Record<string, unknown>) {
  if (Array.isArray(params.address_n)) return params.address_n;
  if (Array.isArray(params.path)) return params.path;
  if (typeof params.path !== 'string') return undefined;

  try {
    return getHDPath(params.path);
  } catch {
    return params.path;
  }
}

function buildTonEncodedPayload(
  method: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  if (method === 'tonGetAddress' && Array.isArray(params.bundle)) {
    return {
      bundle: params.bundle.map(item =>
        item && typeof item === 'object'
          ? buildTonEncodedPayload(method, item as Record<string, unknown>)
          : item
      ),
    };
  }

  const payload: Record<string, unknown> = {
    address_n: getAddressN(params),
  };

  Object.entries(params).forEach(([key, value]) => {
    if (COMMON_PROTOCOL_FIELDS.has(key) || key === 'path' || key === 'bundle') return;
    payload[TON_FIELD_MAP[key] ?? key] = value;
  });

  if (method === 'tonSignMessage' && typeof params.initState === 'string') {
    const initState = params.initState.replace(/^0x/i, '');
    payload.init_data_length = initState.length > 0 ? Math.ceil(initState.length / 2) : undefined;
    payload.init_data_initial_chunk = initState.length > 0 ? initState.slice(0, 2048) : undefined;
    delete payload.initState;
  }

  return cleanProtocolPayload(payload);
}

function buildEncodedPayload(method: string, params: Record<string, unknown>) {
  const methodParams = omitCommonProtocolFields(params);
  if (method.startsWith('ton')) {
    return buildTonEncodedPayload(method, methodParams);
  }

  return methodParams;
}

function getWireInfo(method: UnifiedMethodConfig) {
  return (
    TON_WIRE_INFO[method.method] ?? {
      tx: `${method.method} SDK call`,
      rx: 'SDK response',
      decoded: method.description ?? method.method,
    }
  );
}

function buildInlineProtocolLogData({
  method,
  request,
  response,
  error,
}: {
  method: UnifiedMethodConfig;
  request: Record<string, unknown>;
  response?: unknown;
  error?: string;
}) {
  const wireInfo = getWireInfo(method);
  const encoded = summarizeInlineLogValue(buildEncodedPayload(method.method, request));
  const decodedResult = error ? { error } : response;

  return {
    source: 'chains-inline-runner',
    protocol: method.method.startsWith('ton') ? 'Protocol V2' : 'SDK',
    method: method.method,
    tx_msg_type: wireInfo.tx,
    tx_payload: encoded,
    encoded,
    rx_msg_type: decodedResult !== undefined ? wireInfo.rx : '-',
    rx_payload: decodedResult !== undefined ? summarizeInlineLogValue(decodedResult) : '-',
    decoded: wireInfo.decoded,
    request_parameters: summarizeInlineLogValue(omitCommonProtocolFields(request)),
    ...(decodedResult !== undefined
      ? { decoded_result: summarizeInlineLogValue(decodedResult) }
      : {}),
  };
}

function getPresetExecutionParams(preset?: MethodPreset) {
  if (!preset) {
    return {};
  }

  return processParameters(
    Object.fromEntries(
      preset.parameters
        .filter(parameter => parameter.visible !== false && parameter.value !== undefined)
        .map(parameter => [parameter.name, parameter.value])
    )
  );
}

function splitPresetExecutionParams(preset?: MethodPreset): {
  methodParams: Record<string, unknown>;
  commonParams: Partial<CommonParametersState>;
} {
  const params = getPresetExecutionParams(preset);
  const methodParams: Record<string, unknown> = {};
  const commonParams: Partial<CommonParametersState> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (!COMMON_PARAMETER_NAMES.has(key)) {
      methodParams[key] = value;
      return;
    }

    if (key === 'useEmptyPassphrase') {
      commonParams.useEmptyPassphrase = Boolean(value);
    } else if (key === 'deriveCardano') {
      commonParams.deriveCardano = Boolean(value);
    } else if (key === 'passphraseState') {
      commonParams.passphraseState = String(value);
    }
  });

  return { methodParams, commonParams };
}

function inlineStatusLabel(status: InlineExecutionState['status']) {
  switch (status) {
    case 'loading':
      return 'Running';
    case 'success':
      return 'Success';
    case 'cancelled':
      return 'Cancelled';
    case 'error':
      return 'Error';
    case 'idle':
    default:
      return 'Idle';
  }
}

function inlineStatusClassName(status: InlineExecutionState['status']) {
  switch (status) {
    case 'success':
    case 'loading':
      return 'border-primary bg-primary text-primary-foreground shadow-sm';
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300';
    case 'cancelled':
      return 'border-border/70 bg-muted/40 text-muted-foreground';
    case 'idle':
    default:
      return 'border-border/70 text-muted-foreground';
  }
}

const ChainMethodsIndexPage: React.FC = () => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);
  const [selectedPresetTitle, setSelectedPresetTitle] = useState<string | null>(null);
  const [inlineExecution, setInlineExecution] = useState<InlineExecutionState>({ status: 'idle' });
  const [inlineExecutionStartTime, setInlineExecutionStartTime] = useState<number | null>(null);
  const [isInlineCancelling, setIsInlineCancelling] = useState(false);

  const { selectedChain, isChainNotFound } = useMethodResolver({ chainId });
  const { executeMethod, canExecute, currentDevice } = useHardwareMethodExecution();
  const {
    commonParameters,
    methodParameters,
    setMethodParameters,
    setCommonParameters,
  } = useHardwareStore();
  const { logs: globalLogs } = useDeviceStore();

  const methods = useMemo(() => selectedChain?.methods ?? [], [selectedChain?.methods]);

  const activeMethod = useMemo(() => {
    if (methods.length === 0) {
      return undefined;
    }

    return methods.find(method => method.method === selectedMethodName) || methods[0];
  }, [methods, selectedMethodName]);

  const activePreset = useMemo(() => {
    if (!activeMethod) {
      return undefined;
    }

    return (
      activeMethod.presets.find(preset => preset.title === selectedPresetTitle) ||
      activeMethod.presets[0]
    );
  }, [activeMethod, selectedPresetTitle]);

  useEffect(() => {
    if (!activeMethod) {
      setSelectedMethodName(null);
      return;
    }

    if (activeMethod.method !== selectedMethodName) {
      setSelectedMethodName(activeMethod.method);
    }
  }, [activeMethod, selectedMethodName]);

  useEffect(() => {
    if (!activeMethod) {
      setSelectedPresetTitle(null);
      return;
    }

    if (!activeMethod.presets.some(preset => preset.title === selectedPresetTitle)) {
      setSelectedPresetTitle(activeMethod.presets[0]?.title ?? null);
    }
  }, [activeMethod, selectedPresetTitle]);

  useEffect(() => {
    setInlineExecution({ status: 'idle' });
    setInlineExecutionStartTime(null);
    setIsInlineCancelling(false);
  }, [activeMethod?.method, activePreset?.title]);

  useEffect(() => {
    const { methodParams, commonParams } = splitPresetExecutionParams(activePreset);
    setMethodParameters(methodParams);
    if (Object.keys(commonParams).length > 0) {
      setCommonParameters(commonParams);
    }
  }, [activePreset, setCommonParameters, setMethodParameters]);

  const handleOpenRunner = (methodName: string) => {
    navigate(`/chains/${chainId}/${methodName}`);
  };

  const getInlineExecutionParams = useCallback(
    () =>
      cleanExecutionParams({
        ...methodParameters,
        ...commonParameters,
      }),
    [commonParameters, methodParameters]
  );

  const activeRequestPayload = useMemo(
    () => getInlineExecutionParams(),
    [getInlineExecutionParams]
  );
  const activeRequestPreview = useMemo(
    () =>
      formatJsonPreview(activeRequestPayload, {
        indent: 2,
        maxDepth: 6,
        maxArrayItems: 20,
        maxObjectKeys: 60,
        maxStringLength: 512,
      }),
    [activeRequestPayload]
  );
  const inlineResponsePreview = useMemo(
    () =>
      inlineExecution.response !== undefined
        ? formatJsonPreview(inlineExecution.response, {
            maxDepth: 6,
            maxArrayItems: 20,
            maxStringLength: 512,
          })
        : '',
    [inlineExecution.response]
  );

  const currentExecutionLogs = useMemo(() => {
    if (!inlineExecutionStartTime) {
      return [];
    }

    return globalLogs.filter(log => {
      const logTime =
        typeof log.timestamp === 'string'
          ? new Date(log.timestamp).getTime()
          : log.timestamp.getTime();
      return logTime >= inlineExecutionStartTime;
    });
  }, [globalLogs, inlineExecutionStartTime]);

  const handleClearInlineLogs = useCallback(() => {
    setInlineExecutionStartTime(Date.now());
  }, []);

  const handleInlineExecute = useCallback(async () => {
    if (!activeMethod) {
      return;
    }

    const request = activeRequestPayload;
    const startTime = Date.now();
    setInlineExecutionStartTime(startTime - 1);

    if (!canExecute) {
      logHardware(
        'Chain method decoded response',
        buildInlineProtocolLogData({
          method: activeMethod,
          request,
          error: 'Device not connected',
        })
      );
      setInlineExecution({
        status: 'error',
        request,
        error: 'Device not connected',
      });
      return;
    }

    setInlineExecution({
      status: 'loading',
      request,
    });
    logHardware(
      'Chain method protocol trace',
      buildInlineProtocolLogData({
        method: activeMethod,
        request,
      })
    );

    try {
      const response = await executeMethod(request, activeMethod);
      logHardware(
        'Chain method decoded response',
        buildInlineProtocolLogData({
          method: activeMethod,
          request,
          response,
        })
      );
      setInlineExecution({
        status: 'success',
        request,
        response,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logHardware(
        'Chain method decoded response',
        buildInlineProtocolLogData({
          method: activeMethod,
          request,
          error: errorMessage,
        })
      );
      setInlineExecution({
        status: 'error',
        request,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      });
    }
  }, [activeMethod, activeRequestPayload, canExecute, executeMethod]);

  const handleInlineCancel = useCallback(async () => {
    if (!currentDevice?.connectId) {
      return;
    }

    setIsInlineCancelling(true);
    try {
      await cancelHardwareOperation(currentDevice.connectId);
      setInlineExecution(current => ({
        ...current,
        status: 'cancelled',
        error: 'Cancelled',
      }));
    } catch (error) {
      setInlineExecution(current => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setIsInlineCancelling(false);
    }
  }, [currentDevice?.connectId]);

  return (
    <ChainBoundary chainId={chainId} checkNotFound={isChainNotFound}>
      {selectedChain && (
        <PageLayout fixedHeight={true}>
          <div className="flex h-full min-h-0 flex-col px-4 py-3">
            <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
              <Breadcrumb
                items={[
                  {
                    label: t('chains.title'),
                    href: '/chains',
                    icon: Layers,
                  },
                  {
                    label: selectedChain.id,
                    icon: () => <ChainIcon chainId={selectedChain.id} size={16} />,
                  },
                ]}
              />

              <DeviceNotConnectedState />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
              <section className="flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80">
                <div className="border-b border-border/70 p-3">
                  <div className="mb-3 flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background">
                      <ChainIcon chainId={selectedChain.id} size={22} />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-base font-semibold text-foreground">
                        {selectedChain.id}
                      </h1>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {methods.map(method => {
                      const isActive = activeMethod?.method === method.method;

                      return (
                        <button
                          key={`${selectedChain.id}-${method.method}`}
                          type="button"
                          className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                            isActive
                              ? 'border-primary/50 bg-primary/10 text-foreground'
                              : 'border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground'
                          }`}
                          onClick={() => setSelectedMethodName(method.method)}
                        >
                          <span className="block min-w-0 truncate font-mono text-xs font-semibold">
                            {method.method}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {methods.length === 0 && (
                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
                      <h3 className="text-sm font-semibold text-foreground">No methods found</h3>
                    </div>
                  )}
                </div>
              </section>

              <section className="min-h-[360px] min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card/80">
                {activeMethod ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="border-b border-border/70 p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <h2 className="break-words font-mono text-lg font-semibold text-foreground">
                            {activeMethod.method}
                          </h2>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleInlineExecute}
                            disabled={inlineExecution.status === 'loading' || !canExecute}
                          >
                            {inlineExecution.status === 'loading' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            Execute
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleInlineCancel}
                            disabled={inlineExecution.status !== 'loading' || isInlineCancelling}
                          >
                            {isInlineCancelling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRunner(activeMethod.method)}
                          >
                            Details
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      <div className="flex min-h-full min-w-0 flex-col gap-4">
                        <div className="flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-background">
                          <div className="border-b border-border/70 px-4 py-3">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">
                                  Method parameters
                                </div>
                                {activePreset?.description && (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {activePreset.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-3">
                              <ParameterInput
                                methodConfig={activeMethod}
                                selectedPreset={activePreset?.title || null}
                                onPresetChange={setSelectedPresetTitle}
                                embedded
                              />
                            </div>
                          </div>

                          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-2">
                            <div className="flex min-h-[260px] min-w-0 flex-col border-b border-border/70 xl:border-b-0 xl:border-r">
                              <div className="border-b border-border/70 px-4 py-2.5 text-sm font-semibold text-foreground">
                                Request payload
                              </div>
                              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                                {activeRequestPreview}
                              </pre>
                            </div>

                            <div className="flex min-h-[260px] min-w-0 flex-col">
                              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
                                <div className="text-sm font-semibold text-foreground">
                                  Response
                                </div>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs ${inlineStatusClassName(
                                    inlineExecution.status
                                  )}`}
                                >
                                  {inlineStatusLabel(inlineExecution.status)}
                                </span>
                              </div>

                              <div className="min-h-0 flex-1 overflow-auto p-4">
                                {inlineExecution.durationMs !== undefined && (
                                  <div className="mb-3 text-xs text-muted-foreground">
                                    Duration: {inlineExecution.durationMs}ms
                                  </div>
                                )}

                                {inlineExecution.status === 'idle' && (
                                  <div className="rounded-md border border-dashed border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">
                                    Execute the selected preset to view the response here.
                                  </div>
                                )}

                                {inlineExecution.status === 'loading' && (
                                  <div className="flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-3 text-sm font-medium text-primary-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Waiting for device response...
                                  </div>
                                )}

                                {inlineExecution.status === 'error' && (
                                  <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-3 text-sm text-red-600 dark:text-red-300">
                                    {inlineExecution.error}
                                  </div>
                                )}

                                {inlineExecution.status === 'cancelled' && (
                                  <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                                    Cancelled
                                  </div>
                                )}

                                {inlineExecution.response !== undefined && (
                                  <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                                    {inlineResponsePreview}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col overflow-hidden">
                          <ProtocolExecutionLog
                            logs={currentExecutionLogs}
                            onClearLogs={handleClearInlineLogs}
                            panelHeightClassName="h-[280px] xl:h-[340px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[360px] items-center justify-center px-4 text-center">
                    <div>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">No method selected</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Select a method from the list to inspect its presets.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </PageLayout>
      )}
    </ChainBoundary>
  );
};

export default ChainMethodsIndexPage;
