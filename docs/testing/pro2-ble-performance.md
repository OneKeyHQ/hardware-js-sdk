# Pro2 BLE 传输测速记录

> 文档类型：核心机制
> 适用读者：Hardware SDK、App Hardware、Firmware 与 QA 工程师
> 内容状态：当前实现 + 分日期历史基线
> 代码范围：`hd-transport`、`hd-transport-*`、Core Protocol V2 文件写入与 Pro2 host-asset package
> 最后代码核验：2026-08-26
> 前置阅读：[Protocol V1/V2 传输协议](../protocol/protocol-v1-v2.md)、[Pro2 设备管理](../business/pro2-device-management.md)

## 本页解决什么问题

- 给出当前 SDK 的 BLE packet、file chunk、write mode 和无损压缩结论。
- 区分已完成的代码/单元测试与真正跑过的物理平台，禁止跨平台外推。
- 用分段耗时判断瓶颈位于 Host 写入、BLE 链路还是 firmware 串行 ACK。

## 当前实现结论

Protocol V2 BLE 的生产默认值如下：

| 范围                                          | 当前行为                                                     | 边界                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Protocol 选择                                 | method 明确只支持 V2 时直接按 `expected V2` 探测             | 双协议与 V1-only method 不改变原顺序；不根据名称/PID 推导 BLE 协议                         |
| 普通 `FilesystemFileWrite`                    | `1800B`                                                      | 保留最长 127-byte filesystem path 的 frame 空间                                            |
| firmware 固定 staging path                    | `1960B`                                                      | 最长当前路径的完整 frame 低于 `2048B`                                                      |
| firmware `1.0.1+` 固定 `wallpaper.okpkg` path | `1960B`                                                      | 仅通过内部 BLE-only override 放宽；WebUSB 和 legacy wallpaper path 不受影响                |
| Protocol V2 BLE packet                        | 协商值，生产上限 `244B`                                      | LowLevel 未报告能力时回退 `192B`；React Native 缺失 MTU 时不猜测高容量                     |
| Write mode                                    | 支持时默认 `withoutResponse`                                 | characteristic 仅支持 acknowledged write 或调用方显式设置 `writeWithResponse: true` 时例外 |
| Host-asset compression                        | dependency-free raw LZ4，优先 `16KiB` block、超限回退 `8KiB` | 解压后的 RGB565 bytes 不变，保留现有 dithering；兼容 firmware compressed-buffer 上限       |
| File response                                 | 每个 chunk 等待 `FilesystemFile` 与 `processed_byte`         | Protocol V2 响应仍按串行 session 管理，不并发发送有副作用的 file-write                     |

### 为什么不能把所有 BLE file chunk 统一为 1960B

`2048B` 限制作用于完整 Protocol V2 frame，而不是只作用于 file data。完整 frame 还包含 protobuf
中的 path、offset、total size、flags，以及 Protocol V2 header/CRC。使用生产 schema、最大 uint32
offset/total size 和完整 flags 编码后的边界如下：

| 场景                               | UTF-8 path | `1960B` data 对应完整 frame | 结论             |
| ---------------------------------- | ---------: | --------------------------: | ---------------- |
| `vol1:/wallpapers/wallpaper.okpkg` |      `32B` |                     `2028B` | 安全，余量 `20B` |
| 最长 firmware staging path         |      `24B` |                     `2020B` | 安全，余量 `28B` |
| SDK 允许的最长 filesystem path     |     `127B` |                     `2123B` | 超限 `75B`       |

最长合法 path 下，`1885B` data 编码后已经恰好是 `2048B`。物理测试中，完整 frame 恰好占满
firmware UART FIFO 的配置会卡住，因此不能使用该理论极值作为生产默认。通用值保留 `1800B`；
只有 path 由 SDK 固定、且完整 frame 已通过生产 schema 边界测试的调用方才放宽到 `1960B`。

### FileWrite 场景审计

| SDK 场景                             | Path 来源                                                       |      `1960B` 最坏 frame | 当前 BLE chunk | 判断                                      |
| ------------------------------------ | --------------------------------------------------------------- | ----------------------: | -------------: | ----------------------------------------- |
| Firmware 主组件                      | SDK 固定 staging path，最长 `24B`                               |                 `2020B` |        `1960B` | 已启用并有 frame test                     |
| Wallpaper host-asset package         | SDK 固定 `32B` path                                             |                 `2028B` |        `1960B` | 已启用、frame test 与 macOS CLI 实测通过  |
| Firmware resource archive            | 签名 package header，最多 `64B`；boot resource staging 为 `52B` | boot staging 为 `2048B` |        `1800B` | 不能提升；会命中已知卡死边界              |
| NFT image/thumbnail/metadata/package | SDK 根据 hash 与 safe-integer timestamp 生成，最长 `45B`        |                 `2041B` |        `1800B` | 协议边界可容纳，但仅余 `7B`，尚无真机结果 |
| Portfolio pending package            | SDK 固定 `39B` path                                             |                 `2035B` |        `1800B` | 协议边界可容纳，但尚无真机结果            |
| 公共 `fileWrite`                     | 调用方提供，最长 `127B`                                         |                 `2123B` |        `1800B` | 必须保持通用安全值                        |

NFT 与 Portfolio 的数值是生产 schema 静态编码结果，不是物理平台验证结果。若后续放宽，应使用
caller-specific BLE limit、增加固定 path frame test，并分别做真机上传与应用验证；不能修改公共
`fileWrite` 默认值，也不能把结果外推到 firmware resource archive。

### 平台 MTU 与 packet capacity

不同原生库对 `mtu` 字段的语义并不一致，SDK 先归一化再取 `244B` 上限：

| 平台链路             | 原生上报                                                       | SDK 计算                                                 |
| -------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| React Native iOS     | `maximumWriteValueLength(.withoutResponse) + 3`                | 减 3 后取不超过 `244B`                                   |
| React Native Android | ATT MTU                                                        | 减 3 后取不超过 `244B`                                   |
| Electron macOS       | Noble 上报 `maximumWriteValueLength(.withoutResponse)` payload | Electron main process 先补 3 为 ATT MTU，renderer 再减 3 |
| Electron Windows     | Noble 上报 `MaxPduSize` payload                                | Electron main process 先补 3 为 ATT MTU，renderer 再减 3 |
| Electron Linux       | Noble HCI 上报 ATT MTU                                         | 保持原值，再减 3                                         |
| CLI LowLevel         | 插件直接报告单次 characteristic write payload                  | 直接使用并限制到 `244B`，缺失时回退 `192B`               |

Electron 的归一化发生在 main process，`getDevice()` 与 MTU change event 对 renderer 始终暴露
ATT MTU；main process 自己分包时也使用同一归一化值。此设计不依赖 Noble 升级。

## 2026-08-26 macOS CLI 当前实现验证

### 测试环境

- 设备：OneKey Pro 2 4B8F，firmware `1.0.1`。
- Host：macOS，BLE，SDK worktree `perf/pro2-ble-transfer`。
- 测试入口：本地构建 CLI `upload-wallpaper`；正式 CLI `1.2.1` 仅用于版本 preflight。
- 输入：`604x1024` JPEG，文件大小 `106869B`，SHA-256
  `d34dcf3ad944e4c415bc81e9b4f3380561c3ef3fd34add7b7a56f8d9caa5a182`。
- 设备条件：屏幕保持点亮、设备已解锁、流程不需要 PIN/确认。
- 指标口径：Core `[FileWrite]` 日志为传输分段事实；CLI metrics 用于核对最终总量与进度。

### Packet 与 file chunk A/B

前四行使用相同的 `882528B` host-asset package，仅改变 transport 参数；后两行依次记录
`4KiB` block 的上一版 LZ4 encoder，以及当前自适应 `16KiB/8KiB` block encoder。

| Packet capacity | File chunk | Package bytes |                  Core transfer |           Throughput | 结果状态       |
| --------------: | ---------: | ------------: | -----------------------------: | -------------------: | -------------- |
|           `64B` |    `1800B` |      `882528` |                       `97.83s` |         `8.81 KiB/s` | baseline 成功  |
|          `192B` |    `1800B` |      `882528` |                       `69.81s` |        `12.35 KiB/s` | 成功           |
|          `192B` |    `1960B` |      `882528` |                       `64.05s` |        `13.46 KiB/s` | 成功           |
|          `244B` |    `1960B` |      `882528` |            `50.64s` / `52.53s` |   平均 `16.72 KiB/s` | 两次成功       |
|          `244B` |    `1960B` |      `832131` |                       `49.20s` |        `16.34 KiB/s` | 上一版成功应用 |
|          `244B` |    `1960B` |      `750295` | `51.30s` / `47.40s` / `52.13s` | 中位数 `15.12 KiB/s` | 三次成功应用   |

当前自适应版本的 CLI 独立口径为 `51.12s` / `47.28s` / `51.96s`，中位数 `51.12s`；它与
Core 的计时起止点略有差异，不应混在同一列做 A/B。相对最初 `64B/1800B` baseline，当前
实现的 Core 中位传输时间缩短约 `47.6%`，中位吞吐提升约 `71.6%`。

`16KiB` 版本相对 `4KiB` 版本把 package 减少 `81836B`（`9.8%`），file-write ACK 从 `425`
次降为 `383` 次（`9.9%`）。但 `4KiB` 只记录过一次 `49.20s`，`16KiB` 三次结果受 BLE
response latency 波动影响，其中两次比该单次结果慢，不能据此宣称端到端稳定提升 `9.8%`。
可确认的收益是相同链路条件下减少发送 bytes 和串行 ACK 数；耗时收益需要更多交错 A/B 才能
从无线链路噪声中分离。

### V2-first A/B

同一台设备的 `get-state` 冷连接对比结果：

| Probe 顺序                                     |    总耗时 |
| ---------------------------------------------- | --------: |
| V1-first，失败后重连并探测 V2                  | `13.913s` |
| method contract 明确 V2-only，直接 expected V2 | `10.572s` |

V2-first 节省 `3.341s`。该优化来源是 `BaseMethod.getSupportedProtocols()` 的明确契约，不使用
BLE name、设备型号或 PID 推导协议。

### 分段耗时与当前瓶颈

当前 `750295B` package 三次上传的 Core 日志为：

| 指标                            |                                               结果 |
| ------------------------------- | -------------------------------------------------: |
| File transfer                   |                     `51.30s` / `47.40s` / `52.13s` |
| Host complete-frame write total |                        `0.90s` / `0.90s` / `1.02s` |
| Firmware response wait total    |                     `50.24s` / `46.31s` / `50.92s` |
| Measured attempts               |                                     每次均为 `383` |
| Timeout retry                   |                                       三次均为 `0` |
| 最终状态                        | 三次均完成接收、校验、解包并应用为 `wallpaper.bin` |

response wait 占传输时间约 `98%`。每次 ACK 的平均 response wait 在三轮之间约为
`121-133ms`，足以覆盖减少 42 次 ACK 所带来的理论收益。因此在当前 firmware 的串行
`FilesystemFileWrite -> FilesystemFile(processed_byte)` 模型下，继续减少 JS write delay 的收益很小；
显著提升需要改变 ACK 粒度、允许安全的多请求关联，或扩大 firmware frame/FIFO 边界。

### BLE firmware connection-interval A/B

This experiment kept the SDK packet capacity (`244B`), file chunk (`1960B`), package
(`750295B`), PHY, DLE, and serial request/response model unchanged. The only production candidate
in the BLE firmware was changing the preferred maximum connection interval from `30ms` to `15ms`.
The firmware was built with the CI-matching Arm GNU Toolchain `15.2.1`, loaded through J-Link at
`4000kHz`, and started through the existing MBR/SoftDevice vector. The tested image was an unsigned
debug image; it is test evidence, not a signed release artifact.

RTT established the link-level facts:

| Link event                        | `30ms` baseline                                      | `15ms` candidate                                 |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Initial central-selected interval | `24` units (`30ms`)                                  | `24` units (`30ms`)                              |
| Peripheral parameter update       | Not required because `30ms` was inside the old range | After about `5.28s`: min/max `12` units (`15ms`) |
| Slave latency                     | `0`                                                  | `0`                                              |
| PHY                               | `2M` TX / `2M` RX                                    | `2M` TX / `2M` RX                                |
| Effective data length             | `251B` TX / `251B` RX, `2120us`                      | `251B` TX / `251B` RX, `2120us`                  |

The same CLI command and wallpaper package produced:

| Firmware setting           | CLI transfer time | CLI throughput | Core response wait | Attempts | Result  |
| -------------------------- | ----------------: | -------------: | -----------------: | -------: | ------- |
| max interval `30ms`        |          `51.51s` |  `14.22 KiB/s` |           `51.52s` |    `383` | Success |
| max interval `15ms`, run 1 |          `35.96s` |  `20.38 KiB/s` |           `35.98s` |    `383` | Success |
| max interval `15ms`, run 2 |          `36.23s` |  `20.22 KiB/s` |           `36.28s` |    `383` | Success |

The two `15ms` runs had a median transfer time of about `36.10s` and median throughput of about
`20.30 KiB/s`. Against the single `30ms` control run, this reduced transfer time by about `29.9%`
and increased throughput by about `42.8%`. Mean response wait per request fell from about `134.5ms`
to `94.0-94.7ms`; host writes remained below `0.3s`, so the improvement came from link scheduling,
not JavaScript write throughput.

Reducing `FIRST_CONN_PARAMS_UPDATE_DELAY` from `5s` to `1s` was also tested. RTT confirmed that the
link reached `15ms` about `1.27s` after connection, but completed runs ranged from `35.82s` to
`39.71s`, with no stable improvement over the two `5s` runs. The `1s` change was therefore reverted
to avoid overlapping the connection-parameter procedure with security, DLE, and PHY negotiation.

This is a macOS CLI result only. The `15ms` GAP preference is firmware-wide, but each iOS, Android,
Windows, or macOS central may select or reject connection parameters differently; those platforms
still require physical regression testing. A `7.5ms` fixed interval was not selected because it
would materially increase cross-platform compatibility and power-risk without evidence from those
centrals. With `15ms`, `2M PHY`, `251B` DLE, zero slave latency, and a `15ms` BLE event-length budget,
the next major limit remains the one-response-per-`FilesystemFileWrite` firmware/main-MCU path.

### Protocol V2 bootloader firmware-update baseline and metric contract

The same Pro 2 4B8F was placed in bootloader mode and updated over BLE with locally built and
signed P1/P2 application artifacts. The device started and ended the run on firmware `1.0.1`,
bootloader `1.0.0`, and BLE firmware `1.0.20`.

| Metric                      |                         Result |
| --------------------------- | -----------------------------: |
| Total staged bytes          |                   `2,440,562B` |
| Transfer phase              |                      `145.62s` |
| Average transfer throughput |                  `16.37 KiB/s` |
| Device install phase        |                       `13.65s` |
| End-to-end CLI duration     |                      `211.96s` |
| SDK transfer retries        |                            `0` |
| Final state                 | Normal mode; versions verified |

The first progress sample was about `9.16 KiB/s`; later samples stabilized around
`15.7-17.0 KiB/s`. Consumers should therefore wait for at least `2s` and `64KiB` before showing an
ETA. This avoids presenting the connection and first-write warm-up as a stable estimate.

`FIRMWARE_PROGRESS` now treats `transferredBytes`, `totalBytes`, `rateBytesPerSecond`, and
`elapsedMs` as one batch-level metric stream. The clock and byte numerator do not reset when the
update moves from P1 to P2, another component, or a resource package. Recovery and retry time stays
inside the elapsed value because it is time the user actually waits. The terminal `100%` event also
carries the final metric snapshot, so App consumers do not lose the completed transfer when the
install phase begins.

The SDK reports measured transfer facts only. ETA formatting, warm-up policy, and the distinction
between active duration and wall-clock workflow duration belong to the App layer. This keeps the
same metric contract available to iOS, Android, Windows, and macOS without adding platform-specific
transport behavior.

### 无损压缩与画质边界

第一阶段的 LZ4 best-match encoder 把同一 RGB565 wallpaper package 从 `882528B` 降到
`832131B`，减少 `50397B`（约 `5.7%`）。在此基础上，扩大 independently compressed block
可以利用跨 `4KiB` 边界的重复像素，并减少 block index 开销：

| LZ4 block | Package bytes | Block count | Package build median | 相对 `4KiB` |
| --------: | ------------: | ----------: | -------------------: | ----------: |
|    `4KiB` |      `832131` |       `303` |            `53.60ms` |    baseline |
|    `8KiB` |      `787184` |       `152` |            `54.83ms` |     `-5.4%` |
|   `16KiB` |      `750295` |        `76` |            `51.55ms` |     `-9.8%` |

`16KiB` 离线 package 的独立 raw-LZ4 decoder 输出与原始 `1237004B` RGB565 data 逐字节一致，
二者 SHA-256 均为 `f315fef8198114ef1d037fc8a2fa3f03d940150b96f6d2b26402bc3787fe57c4`。
基准图的最大 compressed block 为 `13401B`，低于 firmware 的 `16384B` buffer 上限。

不可压缩的 `16KiB` raw block 可能编码成大于 `16384B` 的 LZ4 block。当前 SDK 因此先尝试
`16KiB`，只要该 entry 的任一 compressed block 超限，就把该 entry 整体重新编码为 `8KiB`。
Firmware `1.0.1` 接受 `block_size_log2=9..14`，且 work buffer 已按 `16KiB` 分配；`8KiB`
fallback 的 LZ4 worst-case 大小仍低于该 buffer。自动化测试覆盖 preferred、fallback 和两条路径的
byte-for-byte round trip。

以下是 search depth 的补充对比；它不如 block size 有效：

| Search depth | Package bytes | Package build |
| -----------: | ------------: | ------------: |
|         `64` |      `832131` |     约 `61ms` |
|        `256` |      `831944` |  约 `66-69ms` |

`4KiB` 下 `256` 只再减少 `187B`；`16KiB` 下把 depth 从 `64` 提升到 `1024` 也只再减少
`945B`，没有足够收益，当前保留 `64`。这项优化只改变 raw LZ4 token 和 block 边界选择，
firmware 解压后的 RGB565 bytes 与压缩前逐字节一致。

断开 USB 后，Pro2 4B8F firmware `1.0.1` 对 `16KiB` package 连续三次完成 BLE 上传、设备端
校验、解包和应用；没有 timeout/retry。该结果验证了 firmware compatibility 和数据完整流程，
不代表 iOS、Android 或 Windows 的无线性能结果。

当前实现没有关闭 dithering。Dithering 是 RGB888 转 RGB565 前的误差扩散，用细小的像素变化
减少渐变色带；关闭后虽然更容易压缩，但可能出现天空、阴影等区域的 banding，不能称为同画质方案。

### 平台验证矩阵

| 平台                 | 当前代码覆盖                                                                        | 自动化验证                              | 物理验证         |
| -------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | ---------------- |
| macOS CLI LowLevel   | `244B`、`1960B` 固定 wallpaper path、V2-first、无损 LZ4                             | 已覆盖 packet/fallback 与 Core 文件写入 | 已完成，本节结果 |
| React Native iOS     | MTU refresh、`244B` ceiling、默认 `withoutResponse`、共享 Core 优化                 | RN strategy/link tests 已通过           | 本轮未执行       |
| React Native Android | MTU `517` request、`244B` ceiling、High connection priority、默认 `withoutResponse` | RN strategy/link tests 已通过           | 本轮未执行       |
| Electron macOS       | Noble payload 到 ATT MTU 归一化、`244B`、零 high-throughput pacing                  | platform normalization test 已通过      | 本轮未执行       |
| Electron Windows     | MaxPduSize 到 ATT MTU 归一化、已配对后 `withoutResponse`                            | platform normalization test 已通过      | 本轮未执行       |
| Electron Linux       | ATT MTU 保持原值                                                                    | platform normalization test 已通过      | 本轮未执行       |

当前自动化记录：传输/RN/CLI 聚焦集合 `6 suites / 158 tests` 全通过；Core host package、Protocol V2
frame/file-write 与 Electron MTU 集合 `6 suites / 384 passed / 4 skipped`。`hd-transport`、LowLevel、Core、
React Native transport、Electron transport、Web Device transport 与 CLI 均已完成 build。构建只出现
仓库既有的 external dependency、source map、mixed exports、circular dependency，以及 Electron
未使用参数 warning，没有 build error。App package 发布、安装和 App 真机验证不属于本页已完成结论。

## 2026-05-11 iOS React Native 历史基线

以下结果只代表当日 OneKey Pro2、iOS 真机、React Native Demo 与 `react-native-ble-plx` 组合。
当时 SDK 普通 BLE file chunk 为 `1800B`，测试目标是区分 GATT raw write、RN 写队列与
`FilesystemFileWrite` 串行 ACK。

### 第一轮：SDK 层 speed profile

这一轮通过 RN Demo 的 Pro2 BLE 固件升级入口测试不同 transport pacing 参数。测试结果如下：

| Profile                 |        结果 |
| ----------------------- | ----------: |
| `withResponse baseline` | `2.00 KB/s` |
| `default`               |  `8.0 KB/s` |
| `faster pacing`         |  `9.0 KB/s` |
| `aggressive`            | `9.64 KB/s` |

### 第一轮结论

`writeWithoutResponse` 相比 `writeWithResponse` 有明显收益，`2.00 KB/s -> 8.0 KB/s` 说明写入方式是有效优化点。

但 `default -> aggressive` 只从 `8.0 KB/s` 提升到 `9.64 KB/s`，收益约 20%。这说明 `packetLength`、`burstSize`、`pauseMs`、`flushDelayMs` 这类 pacing 参数不是主要瓶颈，只能做边缘优化。

按 `chunk=1800B` 粗略换算：

```text
8 KB/s  ~= 1800B / 220ms
9 KB/s  ~= 1800B / 195ms
10 KB/s ~= 1800B / 176ms
```

也就是说，当前速率更像是每次 `FilesystemFileWrite` 都要等待设备完成处理并返回 `processed_byte`，下一块才能继续发送。这个串行 ACK 模型会把吞吐限制在“单块大小 / 单轮回包耗时”。

### 第二轮：BLEDiag raw write 测试

这一轮绕过 SDK，仅使用 `react-native-ble-plx` 直接向 OneKey BLE write characteristic 写入数据，用于测 BLE GATT 上行写入天花板。

测试参数和结果：

| requestMTU |    Size |  chunk |       Raw write 结果 | Ping RTT 结果                    |
| ---------: | ------: | -----: | -------------------: | -------------------------------- |
|      `256` | `64 KB` |  `20B` |           `6.0 KB/s` | `iters=40` 时 `no ack within 3s` |
|      `256` | `64 KB` | `128B` |            `21 KB/s` | 未记录                           |
|      `256` | `64 KB` | `182B` |            `25 KB/s` | 未记录                           |
|      `256` | `64 KB` | `253B` |               无回复 | 未记录                           |
|      `256` | `64 KB` | `244B` |          `34.4 KB/s` | 未记录                           |
|      `512` | `64 KB` | `509B` | 无回复，卡在 writing | 未记录                           |

### 第二轮结论

在 iOS 真机 + `react-native-ble-plx` + Pro2 的组合下，稳定可用的 `writeWithoutResponse` payload 上限更接近 `244B`，不是 `requestMTU - 3` 推导出的 `253B`，更不是 `512 - 3 = 509B`。

`chunk=244B` 的 raw write 约 `34.4 KB/s`，这是不经过 SDK、也不等待协议层 ACK 的上行天花板。真实 `firmwareUpdateV4` 只有 `8-10 KB/s`，属于 raw ceiling 上叠加设备端文件写入、`FilesystemFileWrite` 回包、JS/native 调度后的结果。

`chunk=253B` 和 `chunk=509B` 无回复，说明不能只信 `requestMTU`，需要以真机实际稳定结果为准。`requestMTU=512` 在当前组合下不适合作为 Pro2 BLE 固件升级参数。

`raw write` 会直接写非协议数据，只适合测试 GATT 写入队列，可能污染设备协议解析状态。做完 raw write 后，应断开并重新连接，再跑 Ping RTT 或 SDK 固件升级流程。

## 当前推荐参数

用于底层 BLE 上行测速：

```text
requestMTU: 256
raw size: 64KB 或 256KB
raw chunk: 244B
Ping RTT iters: 40 或 100
```

用于 SDK 层 `firmwareUpdateV4` 调试：

```text
普通 FilesystemFileWrite chunkSize: 1800B
FirmwareUpdateV4 固定 staging 路径 chunkSize: 1960B
iOS packetLength: min(协商 MTU - 3, 244B)
Android packetLength: min(协商 MTU - 3, 244B)
write mode: writeWithoutResponse
固定 burst pause: 0ms
固定 flush pause: 0ms
```

React Native 只在取得有效 MTU 后计算 packet capacity；缺失或无效 MTU 不猜测 `244B`。
iOS 连接后通过 `requestMTU(247)` 刷新 `react-native-ble-plx` 的设备快照；该调用不会要求 iOS
重新协商，但会返回由 CoreBluetooth 最大无响应写长度换算出的 MTU。CLI LowLevel 不具备平台
MTU 快照时使用经过当前设备验证的 `192B` fallback，而不是旧的 `64B` fallback。

Android 默认同样使用经过验证的 `244B` 上限。更大的包长只能通过显式 BLE tuning 配置用于
特定手机、固件和设备组合的真机实验，不能作为生产默认值。

不建议继续使用：

```text
iOS raw requestMTU: 512
raw chunk: 509B
raw chunk: 253B
writeWithResponse 作为提速方案
```

## 优化方向

目前更值得关注的是协议层 ACK 粒度，而不是继续微调 pacing。

`FirmwareUpdateV4` 的固定 staging 路径已按生产 Protocol V2 schema 测量 protobuf 和帧头开销。
最长路径 `vol0:/application_p1.bin` 在 uint32 最大 offset/total size 下最多容纳 `1988B` data，
且完整 frame 正好为 `2048B`；SDK 使用 `1960B`，保留 `28B` 余量。固定 wallpaper package
path 使用 `1960B` 时完整 frame 为 `2028B`，保留 `20B`。普通 FileWrite 和未知资源路径仍保持
`1800B`，因为允许的 path 最长可达 `127B`，此时 `1960B` data 会生成 `2123B` frame。

不能直接测试 `2400B`、`3072B` 或 `4096B`：这些数据块加上 protobuf 和 V2 帧开销后必然超过当前 Transport 的 `2048B` 限制。

如果未来要显著增大单次文件块，必须由固件接收缓冲、Protocol V2 BLE 最大帧和各 BLE Transport 的限制共同升级；只修改 `chunkSize` 不会绕过帧上限。

如果 raw write 维持在 `34 KB/s` 左右，即使放大 `FilesystemFileWrite` chunk，RN BLE 链路上限也会限制最终速度，很难接近 WebUSB 或 desktop BLE 的量级。

## SDK 可靠性与事件开销

`FirmwareUpdateV4` 在连接恢复后不再无条件从文件偏移 `0` 重传。SDK 只记录设备通过
`processed_byte` 明确确认的文件偏移；重连、物理设备身份校验和初始化完成后，再通过
`FilesystemPathInfoQuery` 检查 staging 文件。只有远端文件存在、不是目录，且文件大小位于
“本地确认偏移到目标文件总大小”之间时才续传。

远端大小大于本地确认偏移时，SDK 仍从本地确认偏移重写相同数据，不会跳过响应丢失后未确认的
字节。远端文件缺失、大小落后、超过目标大小或状态查询失败时，安全回退到偏移 `0` 并重新覆盖。
这项优化减少了 BLE 断连后的重复传输，同时不把副作用命令的自动重放下沉到 Transport。

文件写入的内部确认回调仍在每个 ACK 后触发，用于保存续传水位和记录真实吞吐；App 可见的
`FIRMWARE_PROGRESS` 则只在整数百分比变化、超过 `1s` 心跳间隔或单文件完成时发送。这样可减少
RN bridge 和 Desktop renderer 的高频事件开销，不影响确认偏移的精度。

## 判断方法

- 如果 raw write 明显高于 SDK 固件升级速率，瓶颈在 `FilesystemFileWrite` 的设备处理和协议 ACK。
- 如果 raw write 自身很低，瓶颈在 RN BLE / iOS BLE / `react-native-ble-plx` 写入队列。
- 如果 Ping RTT 很低但固件升级慢，瓶颈更偏设备端文件系统或 flash 写入。
- 如果 Ping RTT 接近 `180-220ms`，则 `1800B` 下 `8-10 KB/s` 属于当前串行模型的自然结果。
