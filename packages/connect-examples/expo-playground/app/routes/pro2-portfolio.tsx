import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  FileUp,
  Loader2,
  Play,
  Server,
} from 'lucide-react';

import { PageLayout } from '../components/common/PageLayout';
import { useFirmwareProgress } from '../components/providers/SDKProvider';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { Textarea } from '../components/ui/Textarea';
import { callHardwareAPI } from '../services/hardwareService';
import { useDeviceStore } from '../store/deviceStore';
import { isPro2DeviceInfo } from '../utils/pro2Device';
import {
  decodePortfolioPackageBase64,
  inspectPortfolioPackage,
} from '../utils/portfolioPackage';

import type {
  PortfolioPackageInfo,
  PortfolioPackageSource,
} from '../utils/portfolioPackage';

type InputMode = PortfolioPackageSource;
type ExecutionPhase = 'idle' | 'staging' | 'applying' | 'complete' | 'failed';

type ExecutionResult = {
  elapsedMs: number;
  payload: Record<string, unknown>;
};

const INPUT_MODES: Array<{
  id: InputMode;
  label: string;
  description: string;
  icon: typeof Server;
}> = [
  {
    id: 'base64',
    label: 'Server Base64',
    description: 'Paste packageBase64 returned by the Portfolio signing service.',
    icon: Server,
  },
  {
    id: 'file',
    label: 'Local PFOL',
    description: 'Select an already signed .pfol package.',
    icon: FileUp,
  },
  {
    id: 'example',
    label: 'Development example',
    description: 'Load the canonical firmware sample and its development-signed PFOL.',
    icon: FileJson,
  },
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KiB`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getPortfolioErrorGuidance(message: string) {
  if (/unknown message type/i.test(message)) {
    return 'The connected firmware does not support PortfolioUpdate. Update the Pro 2 firmware; do not write directly to portfolio.pfol.';
  }
  if (/invalid portfolio package/i.test(message)) {
    return 'Firmware rejected the staged PFOL. Check its signatures, production flag, portfolio.json entry, schema version, and 10-token limit.';
  }
  if (/timeout|disconnect|not found|network/i.test(message)) {
    return 'Reconnect the device and resend the complete package from offset zero. Do not resume from an assumed offset.';
  }
  if (/offset|size/i.test(message)) {
    return 'The staged transfer was rejected. Retry the complete SDK operation without changing the fixed destination or chunk offsets.';
  }
  return 'Review the SDK and device logs. A file-write acknowledgement alone does not mean PortfolioUpdate succeeded.';
}

function getPublicAssetUrl(path: string) {
  return new URL(path, document.baseURI).toString();
}

export default function Pro2PortfolioPage() {
  const { currentDevice, sdkInitState } = useDeviceStore();
  const { progressData, reset: resetProgress } = useFirmwareProgress();
  const [inputMode, setInputMode] = useState<InputMode>('base64');
  const [base64Value, setBase64Value] = useState('');
  const [fileName, setFileName] = useState<string>();
  const [packageInfo, setPackageInfo] = useState<PortfolioPackageInfo>();
  const [sampleJson, setSampleJson] = useState('');
  const [phase, setPhase] = useState<ExecutionPhase>('idle');
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ExecutionResult>();

  const isRunning = phase === 'staging' || phase === 'applying';
  const isPro2 = isPro2DeviceInfo(currentDevice);
  const canSend = Boolean(
    sdkInitState.isInitialized && isPro2 && packageInfo && !isRunning
  );
  const progressPercent = progressData
    ? Math.min(100, Math.round(progressData.progress))
    : 0;

  const phaseLabel = useMemo(() => {
    if (phase === 'staging') return 'Staging signed PFOL';
    if (phase === 'applying') return 'Validating and applying on device';
    if (phase === 'complete') return 'Portfolio updated';
    if (phase === 'failed') return 'Portfolio update failed';
    return 'Ready';
  }, [phase]);

  const acceptBytes = useCallback((bytes: Uint8Array, source: InputMode) => {
    const inspected = inspectPortfolioPackage(bytes, source);
    setPackageInfo(inspected);
    setError(undefined);
    setResult(undefined);
    setPhase('idle');
  }, []);

  const parseBase64 = useCallback(() => {
    try {
      acceptBytes(decodePortfolioPackageBase64(base64Value), 'base64');
      setFileName(undefined);
    } catch (nextError) {
      setPackageInfo(undefined);
      setError(getErrorMessage(nextError));
    }
  }, [acceptBytes, base64Value]);

  const selectFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        acceptBytes(new Uint8Array(await file.arrayBuffer()), 'file');
        setFileName(file.name);
      } catch (nextError) {
        setPackageInfo(undefined);
        setError(getErrorMessage(nextError));
      }
    },
    [acceptBytes]
  );

  const loadExample = useCallback(async () => {
    try {
      const [jsonResponse, packageResponse] = await Promise.all([
        fetch(getPublicAssetUrl('portfolio/portfolio.sample.json')),
        fetch(getPublicAssetUrl('portfolio/portfolio.sample.pfol')),
      ]);
      if (!jsonResponse.ok || !packageResponse.ok) {
        throw new Error('Unable to load the bundled Portfolio example');
      }
      const [jsonText, packageBuffer] = await Promise.all([
        jsonResponse.text(),
        packageResponse.arrayBuffer(),
      ]);
      setSampleJson(jsonText);
      setFileName('portfolio.sample.pfol');
      acceptBytes(new Uint8Array(packageBuffer), 'example');
    } catch (nextError) {
      setPackageInfo(undefined);
      setError(getErrorMessage(nextError));
    }
  }, [acceptBytes]);

  const sendPortfolio = useCallback(async () => {
    if (!currentDevice || !isPro2DeviceInfo(currentDevice) || !packageInfo) return;

    resetProgress();
    setError(undefined);
    setResult(undefined);
    setPhase('staging');
    const startedAt = Date.now();

    try {
      const packageBytes = packageInfo.bytes.slice().buffer;
      const responsePromise = callHardwareAPI('uploadPortfolio', {
        connectId: currentDevice.connectId,
        packageBytes,
      });
      const applyTimer = window.setTimeout(() => setPhase('applying'), 150);
      const response = await responsePromise;
      window.clearTimeout(applyTimer);
      setPhase('applying');
      if (!response.success) {
        throw new Error(
          String(response.payload?.error ?? 'uploadPortfolio failed')
        );
      }
      if (response.payload?.portfolioUpdated !== true) {
        throw new Error('SDK response did not confirm PortfolioUpdate success');
      }
      setResult({
        elapsedMs: Date.now() - startedAt,
        payload: response.payload,
      });
      setPhase('complete');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setPhase('failed');
    }
  }, [currentDevice, packageInfo, resetProgress]);

  return (
    <PageLayout>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pro 2 Portfolio</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Send a signed PFOL through the complete FilesystemFileWrite → PortfolioUpdate flow.
              Completion is reported only after firmware validates, installs, and applies the
              package.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={sdkInitState.isInitialized ? 'default' : 'outline'}>
              SDK {sdkInitState.isInitialized ? 'ready' : 'initializing'}
            </Badge>
            <Badge variant={isPro2 ? 'default' : 'outline'}>
              {isPro2 ? currentDevice?.connectId : 'No Pro 2 selected'}
            </Badge>
          </div>
        </div>

        {!isPro2 ? (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connect and select a Pro 2</AlertTitle>
            <AlertDescription>
              PortfolioUpdate is a Protocol V2 feature and is intentionally unavailable for other
              device models.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-2 md:grid-cols-3">
              {INPUT_MODES.map(mode => {
                const Icon = mode.icon;
                const selected = inputMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setInputMode(mode.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Icon className="h-4 w-4" />
                      {mode.label}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{mode.description}</div>
                  </button>
                );
              })}
            </div>

            {inputMode === 'base64' ? (
              <div className="space-y-2">
                <Textarea
                  rows={8}
                  value={base64Value}
                  disabled={isRunning}
                  placeholder="Paste packageBase64"
                  onChange={event => setBase64Value(event.target.value)}
                />
                <Button variant="outline" disabled={isRunning} onClick={parseBase64}>
                  Inspect Base64 package
                </Button>
              </div>
            ) : null}

            {inputMode === 'file' ? (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".pfol,application/octet-stream"
                  disabled={isRunning}
                  onChange={event => void selectFile(event.target.files?.[0])}
                />
                <div className="text-xs text-muted-foreground">
                  Select a signed PFOL package. Raw JSON is not accepted by the device.
                </div>
              </div>
            ) : null}

            {inputMode === 'example' ? (
              <div className="space-y-3">
                <Button variant="outline" disabled={isRunning} onClick={() => void loadExample()}>
                  Load canonical development example
                </Button>
                {sampleJson ? (
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                    {sampleJson}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {packageInfo ? (
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Source</div>
                <div className="font-medium text-foreground">{packageInfo.source}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Package</div>
                <div className="font-medium text-foreground">
                  {fileName ?? 'Pasted package'} · {formatBytes(packageInfo.byteLength)}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Header prefix</div>
                <div className="font-mono text-sm text-foreground">{packageInfo.prefixHex}</div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground">{phaseLabel}</div>
                <div className="text-sm text-muted-foreground">
                  Destination is fixed to vol1:/portfolio/portfolio.pfol.pending.
                </div>
              </div>
              <Button disabled={!canSend} onClick={() => void sendPortfolio()}>
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Send once
              </Button>
            </div>

            {isRunning ? (
              <div className="space-y-2">
                <Progress value={progressPercent} />
                <div className="text-xs text-muted-foreground">
                  {phase === 'applying'
                    ? 'File staged. Waiting for PortfolioUpdate validation and apply response.'
                    : `${progressPercent}% staged. Each chunk waits for FilesystemFile acknowledgement.`}
                </div>
              </div>
            ) : null}

            {result ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>PortfolioUpdate succeeded</AlertTitle>
                <AlertDescription>
                  Completed in {result.elapsedMs} ms. Final response:{' '}
                  <code>{JSON.stringify(result.payload)}</code>
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error}</AlertTitle>
                <AlertDescription>{getPortfolioErrorGuidance(error)}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
