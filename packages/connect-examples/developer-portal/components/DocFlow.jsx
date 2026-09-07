const copy = {
  en: {
    lifecycleTitle: 'Call lifecycle',
    lifecycle: [
      { k: '01', t: 'init', d: 'Once. env selects USB / BLE / low-level.' },
      { k: '02', t: 'searchDevices', d: 'Read connectId. Check success.' },
      { k: '03', t: 'getDeviceState', d: 'identity.deviceId. Not getFeatures.' },
      { k: '04', t: 'subscribe UI', d: 'PIN / passphrase / button. uiResponse only on input.' },
      { k: '05', t: 'openWalletSession', d: 'standard or select-hidden. Open once, then persist the binding.' },
      { k: '06', t: 'address / sign', d: 'Pass passphraseState or useEmptyPassphrase. Core resumes the firmware session inside the method.' },
    ],
    walletTitle: 'Open a wallet once',
    wallet: [
      {
        mode: 'standard',
        title: 'Standard',
        steps: ['openWalletSession({ mode: standard })', 'later address / sign with useEmptyPassphrase: true'],
      },
      {
        mode: 'select-hidden',
        title: 'Select hidden',
        steps: ['openWalletSession({ mode: select-hidden })', 'UI_EVENT passphrase if asked', 'persist deviceId + passphraseState', 'later calls pass passphraseState — Core resumes'],
      },
    ],
    walletNote:
      'There is no resume-hidden mode. Later calls that carry passphraseState already run DeviceSessionGet inside Core.',
    hiddenTitle: 'Hidden wallet, one prompt',
    hidden: [
      { from: 'App', to: 'SDK', t: 'openWalletSession(select-hidden)' },
      { from: 'SDK', to: 'Device', t: 'Select hidden wallet' },
      { from: 'Device', to: 'App', t: 'REQUEST_PASSPHRASE → uiResponse' },
      { from: 'SDK', to: 'App', t: 'deviceId + passphraseState' },
      { from: 'App', to: 'SDK', t: 'evmGetAddress / sign + passphraseState' },
      { from: 'SDK', to: 'Device', t: 'DeviceSessionGet — Core, not your app' },
    ],
    transportTitle: 'Transport is not the protocol',
    layers: [
      { t: 'Your app', d: 'UI · PIN · passphrase dialogs' },
      { t: 'HardwareSDK', d: 'init · search · getDeviceState · openWalletSession · sign' },
      { t: 'Transport', d: 'USB (webusb) · BLE (hd-ble-sdk) · native plugin (lowlevel)' },
      { t: 'Protocol', d: 'V1 Classic / Mini / Touch / Pro · V2 Pro 2 / Neo — live probe, not PID' },
      { t: 'Device', d: 'Confirm on hardware. Mini has no BLE. Neo has no Air-Gap camera.' },
    ],
  },
  zh: {
    lifecycleTitle: '调用生命周期',
    lifecycle: [
      { k: '01', t: 'init', d: '只做一次。env 选 USB / BLE / 底层插件。' },
      { k: '02', t: 'searchDevices', d: '拿 connectId。先看 success。' },
      { k: '03', t: 'getDeviceState', d: 'identity.deviceId。不要用 getFeatures。' },
      { k: '04', t: '订阅 UI', d: 'PIN / passphrase / 按键。只有输入类才 uiResponse。' },
      { k: '05', t: 'openWalletSession', d: 'standard 或 select-hidden。开一次，然后存绑定。' },
      { k: '06', t: '地址 / 签名', d: '带 passphraseState 或 useEmptyPassphrase。Core 在方法里恢复固件 session。' },
    ],
    walletTitle: '钱包只开一次',
    wallet: [
      {
        mode: 'standard',
        title: '标准钱包',
        steps: ['openWalletSession({ mode: standard })', '之后地址 / 签名带 useEmptyPassphrase: true'],
      },
      {
        mode: 'select-hidden',
        title: '选择隐藏钱包',
        steps: ['openWalletSession({ mode: select-hidden })', '需要时 UI_EVENT 输入 passphrase', '持久化 deviceId + passphraseState', '之后调用带 passphraseState — Core 负责恢复'],
      },
    ],
    walletNote:
      '没有 resume-hidden。后续带 passphraseState 的调用里，Core 已经会发 DeviceSessionGet。',
    hiddenTitle: '隐藏钱包，只提示一次',
    hidden: [
      { from: '应用', to: 'SDK', t: 'openWalletSession(select-hidden)' },
      { from: 'SDK', to: '设备', t: '选择隐藏钱包' },
      { from: '设备', to: '应用', t: 'REQUEST_PASSPHRASE → uiResponse' },
      { from: 'SDK', to: '应用', t: 'deviceId + passphraseState' },
      { from: '应用', to: 'SDK', t: 'evmGetAddress / 签名 + passphraseState' },
      { from: 'SDK', to: '设备', t: 'DeviceSessionGet — Core 内部，不是应用去调' },
    ],
    transportTitle: '传输不是协议',
    layers: [
      { t: '你的应用', d: '界面 · PIN · passphrase 对话框' },
      { t: 'HardwareSDK', d: 'init · search · getDeviceState · openWalletSession · 签名' },
      { t: '传输', d: 'USB（webusb）· BLE（hd-ble-sdk）· 原生插件（lowlevel）' },
      { t: '协议', d: 'V1 Classic / Mini / Touch / Pro · V2 Pro 2 / Neo — 现场探测，不用 PID' },
      { t: '设备', d: '硬件上确认。Mini 无 BLE。Neo 无 Air-Gap 摄像头。' },
    ],
  },
}

function Shell({ title, children }) {
  return (
    <figure className="doc-flow not-prose my-6 overflow-hidden rounded-[16px] border border-black/[0.08] bg-[#f6f7f6] dark:border-white/10 dark:bg-[#141514]">
      {title ? (
        <figcaption className="border-b border-black/[0.06] px-4 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-black/45 dark:border-white/10 dark:text-white/40">
          {title}
        </figcaption>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </figure>
  )
}

function Code({ children }) {
  return (
    <code
      className="rounded-[6px] bg-black/[0.06] px-[6px] py-[1px] text-[12px] font-normal text-[#0b7a18] dark:bg-white/10 dark:text-[#86EA90]"
      style={{ fontFamily: '"Geist Mono", ui-monospace, monospace' }}
    >
      {children}
    </code>
  )
}

function Lifecycle({ locale }) {
  const t = copy[locale] || copy.en
  return (
    <Shell title={t.lifecycleTitle}>
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {t.lifecycle.map((step, i) => (
          <li key={step.k} className="flex gap-3">
            <div className="flex w-8 flex-col items-center">
              <span className="text-[11px] tabular-nums text-[#00B812]">{step.k}</span>
              {i < t.lifecycle.length - 1 ? <span className="mt-1 w-px flex-1 bg-[#00B812]/35" /> : null}
            </div>
            <div className={`min-w-0 flex-1 ${i < t.lifecycle.length - 1 ? 'pb-4' : ''}`}>
              <div
                className="text-[13px] font-medium text-black dark:text-white"
                style={{ fontFamily: '"Geist Mono", ui-monospace, monospace' }}
              >
                {step.t}
              </div>
              <p className="mt-1 mb-0 text-[12px] leading-[16px] text-black/55 dark:text-white/50">{step.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </Shell>
  )
}

function Wallet({ locale }) {
  const t = copy[locale] || copy.en
  return (
    <Shell title={t.walletTitle}>
      <div className="grid gap-3 sm:grid-cols-2">
        {t.wallet.map((col) => (
          <div
            key={col.mode}
            className="rounded-[12px] border border-black/[0.06] bg-white px-3 py-3 dark:border-white/10 dark:bg-[#1a1c1b]"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#00B812]">{col.mode}</div>
            <div className="mt-1 text-[15px] font-medium text-black dark:text-white">{col.title}</div>
            <ol className="mt-3 mb-0 list-none space-y-2 p-0">
              {col.steps.map((s) => (
                <li key={s} className="flex gap-2 text-[12px] leading-[16px] text-black/65 dark:text-white/60">
                  <span className="mt-[6px] size-[5px] shrink-0 rounded-full bg-[#00B812]" />
                  <span style={{ fontFamily: '"Geist Mono", ui-monospace, monospace' }}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {t.walletNote ? (
        <p className="mt-3 mb-0 text-[12px] leading-[16px] text-black/45 dark:text-white/40">{t.walletNote}</p>
      ) : null}
    </Shell>
  )
}

function Hidden({ locale }) {
  const t = copy[locale] || copy.en
  return (
    <Shell title={t.hiddenTitle}>
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {t.hidden.map((row, i) => (
          <li key={row.t} className="flex gap-3">
            <div className="flex w-5 flex-col items-center">
              <span className="size-[9px] rounded-full border-2 border-[#00B812] bg-white dark:bg-[#141514]" />
              {i < t.hidden.length - 1 ? <span className="w-px flex-1 bg-[#00B812]/35" /> : null}
            </div>
            <div className={`min-w-0 flex-1 ${i < t.hidden.length - 1 ? 'pb-4' : ''}`}>
              <div className="text-[11px] text-black/40 dark:text-white/35">
                {row.from} → {row.to}
              </div>
              <div className="mt-[2px] text-[13px] text-black dark:text-white">
                <Code>{row.t}</Code>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Shell>
  )
}

function Transport({ locale }) {
  const t = copy[locale] || copy.en
  return (
    <Shell title={t.transportTitle}>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {t.layers.map((layer, i) => (
          <li key={layer.t}>
            <div
              className={`rounded-[12px] border px-4 py-3 ${
                i === 3
                  ? 'border-[#00B812]/35 bg-[#00B812]/8'
                  : 'border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1a1c1b]'
              }`}
            >
              <div className="text-[13px] font-medium text-black dark:text-white">{layer.t}</div>
              <p className="mt-1 mb-0 text-[12px] leading-[16px] text-black/55 dark:text-white/50">{layer.d}</p>
            </div>
            {i < t.layers.length - 1 ? (
              <div className="flex justify-center py-1 text-[11px] text-[#00B812]">↓</div>
            ) : null}
          </li>
        ))}
      </ol>
    </Shell>
  )
}

const variants = {
  lifecycle: Lifecycle,
  wallet: Wallet,
  hidden: Hidden,
  transport: Transport,
}

export function DocFlow({ variant = 'lifecycle', locale = 'en' }) {
  const View = variants[variant] || Lifecycle
  return <View locale={locale === 'zh' ? 'zh' : 'en'} />
}
