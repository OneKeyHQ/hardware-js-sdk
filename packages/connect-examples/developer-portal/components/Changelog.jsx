import {
  Package,
  GitBranch,
  Tag,
  ExternalLink,
  Cpu,
  Globe,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import hardwareSdkReleaseData from '../data/hardware-sdk-releases.json';
import providerReleaseData from '../data/provider-releases.json';
import { ui } from '../i18n/ui.mjs';

export default function Changelog({ locale = 'en' }) {
  const localizeRelease = entry => ({
    ...entry,
    changes: entry.changes.en.map(change => ui(locale, change)),
  });
  const HardwareSDKReleases = hardwareSdkReleaseData.hardware.map(localizeRelease);
  const ProviderReleases = providerReleaseData.map(localizeRelease);

  const TypeBadge = ({ type }) => {
    const styles = {
      major:
        'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
      minor:
        'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
      patch:
        'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400 border-zinc-500/20',
    };
    const labels = {
      major: ui(locale, 'Major', '重大更新'),
      minor: ui(locale, 'Feature', '新功能'),
      patch: ui(locale, 'Patch', '修复'),
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${styles[type]}`}
      >
        {labels[type]}
      </span>
    );
  };

  const ReleaseCard = ({ release, isLatest }) => (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isLatest
          ? 'border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/5'
          : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      } hover:border-zinc-300 dark:hover:border-zinc-700`}
    >
      <div className="p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <Tag className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <span className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {release.version}
              </span>
            </div>
            <TypeBadge type={release.type} />
            {isLatest && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500 text-white">
                {ui(locale, 'Latest listed', '本页最新')}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-zinc-400">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{release.date}</span>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {release.changes.map((change, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
            >
              <ChevronRight
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-300 dark:text-zinc-600"
                strokeWidth={1.5}
              />
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const SDKSection = ({ title, icon: Icon, releases, repoUrl, description }) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          </div>
        </div>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
        >
          <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
          {ui(locale, 'View on GitHub', '在 GitHub 查看')}
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      </div>
      <div className="relative pl-6">
        <div className="absolute left-[5px] top-0 bottom-0 w-px bg-gradient-to-b from-zinc-300 via-zinc-200 to-transparent dark:from-zinc-600 dark:via-zinc-700" />
        <div className="space-y-4">
          {releases.map((release, idx) => (
            <div key={release.version} className="relative">
              <div className="absolute -left-6 top-6 flex items-center justify-center">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    idx === 0
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                      : 'border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900'
                  }`}
                />
              </div>
              <ReleaseCard release={release} isLatest={idx === 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-800 dark:bg-zinc-900">
          <Package className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
          <span className="text-xs font-medium text-zinc-500">
            {ui(locale, 'Developer Portal', '开发者门户')}
          </span>
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-5xl">
          {ui(locale, 'Changelog', '更新日志')}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          {ui(
            locale,
            'Selected SDK release highlights. See GitHub for the complete release history.',
            'SDK 版本更新精选。完整发布记录请查看 GitHub。'
          )}
        </p>
      </div>

      {/* SDK Sections */}
      <div className="space-y-16">
        <SDKSection
          title="Hardware JS SDK"
          icon={Cpu}
          releases={HardwareSDKReleases}
          repoUrl="https://github.com/OneKeyHQ/hardware-js-sdk/releases"
          description={ui(
            locale,
            'Connect and communicate with OneKey hardware wallets via WebUSB and Bluetooth.',
            '通过 WebUSB 和蓝牙连接 OneKey 硬件钱包并与其通信。'
          )}
        />

        <SDKSection
          title="Cross Inpage Provider"
          icon={Globe}
          releases={ProviderReleases}
          repoUrl="https://github.com/OneKeyHQ/cross-inpage-provider/releases"
          description={ui(
            locale,
            'Multi-chain provider injection for seamless dApp integration.',
            '注入多链 Provider，方便 dApp 接入。'
          )}
        />
      </div>
    </div>
  );
}
