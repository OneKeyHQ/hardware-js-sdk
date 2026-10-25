# Pro2 BLE 传输测速记录

> 文档类型：核心机制
> 适用读者：Hardware SDK、App Hardware、Firmware 与 QA 工程师
> 内容状态：当前实现 + 分日期历史基线
> 代码范围：`hd-transport`、`hd-transport-*`、Core Protocol V2 文件写入与 Pro2 host-asset package
> 最后代码核验：2026-10-24
> 前置阅读：[Protocol V1/V2 传输协议](../protocol/protocol-v1-v2.md)、[Pro2 设备管理](../business/pro2-device-management.md)

## 本页解决什么问题

- 给出当前 SDK 的 BLE packet、file chunk、write mode 和无损压缩结论。
- 区分已完成的代码/单元测试与真正跑过的物理平台，禁止跨平台外推。
- 用分段耗时判断瓶颈位于 Host 写入、BLE 链路还是 firmware 串行 ACK。

## 当前实现结论

Protocol V2 BLE 的生产默认值如下：

| 范围                                          | 当前行为                                                     | 边界                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Protocol 选择                                 | method 明确只支持 V2 时直接按 `expected V2` 探测             | 双协议与 V1-only method 不改变原顺序；不根据名称/PID 推导 BLE 协议                              |
| 普通 `FilesystemFileWrite`                    | `1800B`                                                      | 保留最长 127-byte filesystem path 的 frame 空间                                                 |
| firmware 固定 staging path                    | 串行 `1960B`，窗口模式 `1800B`                               | 最长当前路径的完整 frame 低于 `2048B`；窗口模式要让 2 帧放进 `4096B` FIFO                       |
| firmware `1.0.1+` 固定 `wallpaper.okpkg` path | `1960B`                                                      | 仅通过内部 BLE-only override 放宽；WebUSB 和 legacy wallpaper path 不受影响                     |
| Protocol V2 BLE packet                        | 协商值，生产上限 `244B`                                      | LowLevel 未报告能力时回退 `192B`；React Native 缺失 MTU 时不猜测高容量                          |
| Write mode                                    | 支持时默认 `withoutResponse`                                 | characteristic 仅支持 acknowledged write 或调用方显式设置 `writeWithResponse: true` 时例外      |
| Host-asset compression                        | dependency-free raw LZ4，优先 `16KiB` block、超限回退 `8KiB` | 解压后的 RGB565 bytes 不变，保留现有 dithering；兼容 firmware compressed-buffer 上限            |
| File response                                 | 每个 chunk 都等待 `FilesystemFile` 与 `processed_byte`       | 默认一问一答；bootloader 达到最低版本（当前为 `1.0.4`）时，V4 同一调用内最多 2 块在途（见下文） |

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

| SDK 场景                             | Path 来源                                                       |      `1960B` 最坏 frame |              当前 BLE chunk | 判断                                      |
| ------------------------------------ | --------------------------------------------------------------- | ----------------------: | --------------------------: | ----------------------------------------- |
| Firmware 主组件                      | SDK 固定 staging path，最长 `24B`                               |                 `2020B` | `1960B`（窗口模式 `1800B`） | 已启用并有 frame test                     |
| Wallpaper host-asset package         | SDK 固定 `32B` path                                             |                 `2028B` |                     `1960B` | 已启用、frame test 与 macOS CLI 实测通过  |
| Firmware resource archive            | 签名 package header，最多 `64B`；boot resource staging 为 `52B` | boot staging 为 `2048B` |                     `1800B` | 不能提升；会命中已知卡死边界              |
| NFT image/thumbnail/metadata/package | SDK 根据 hash 与 safe-integer timestamp 生成，最长 `45B`        |                 `2041B` |                     `1800B` | 协议边界可容纳，但仅余 `7B`，尚无真机结果 |
| Portfolio pending package            | SDK 固定 `39B` path                                             |                 `2035B` |                     `1800B` | 协议边界可容纳，但尚无真机结果            |
| 公共 `fileWrite`                     | 调用方提供，最长 `127B`                                         |                 `2123B` |                     `1800B` | 必须保持通用安全值                        |

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

| 平台                 | 当前代码覆盖                                                                                     | 自动化验证                              | 物理验证         |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------- |
| macOS CLI LowLevel   | `244B`、`1960B` 固定 wallpaper path、V2-first、无损 LZ4                                          | 已覆盖 packet/fallback 与 Core 文件写入 | 已完成，本节结果 |
| React Native iOS     | MTU refresh、`244B` ceiling、默认 `withoutResponse`、共享 Core 优化                              | RN strategy/link tests 已通过           | 本轮未执行       |
| React Native Android | MTU `517` request、`244B` ceiling、HIGH 连接优先级（API 37+ 默认不请求）、默认 `withoutResponse` | RN strategy/link tests 已通过           | 本轮未执行       |
| Electron macOS       | Noble payload 到 ATT MTU 归一化、`244B`、零 high-throughput pacing                               | platform normalization test 已通过      | 本轮未执行       |
| Electron Windows     | MaxPduSize 到 ATT MTU 归一化、已配对后 `withoutResponse`                                         | platform normalization test 已通过      | 本轮未执行       |
| Electron Linux       | ATT MTU 保持原值                                                                                 | platform normalization test 已通过      | 本轮未执行       |

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
FirmwareUpdateV4 固定 staging 路径 chunkSize: 1960B（串行）；窗口模式所有文件 1800B
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
且完整 frame 正好为 `2048B`；串行时 SDK 使用 `1960B`，保留 `28B` 余量（窗口模式统一 `1800B`，见下文）。固定 wallpaper package
path 使用 `1960B` 时完整 frame 为 `2028B`，保留 `20B`。普通 FileWrite 和未知资源路径仍保持
`1800B`，因为允许的 path 最长可达 `127B`，此时 `1960B` data 会生成 `2123B` frame。

不能直接测试 `2400B`、`3072B` 或 `4096B`：这些数据块加上 protobuf 和 V2 帧开销后必然超过当前 Transport 的 `2048B` 限制。

如果未来要显著增大单次文件块，必须由固件接收缓冲、Protocol V2 BLE 最大帧和各 BLE Transport 的限制共同升级；只修改 `chunkSize` 不会绕过帧上限。

如果 raw write 维持在 `34 KB/s` 左右，即使放大 `FilesystemFileWrite` chunk，RN BLE 链路上限也会限制最终速度，很难接近 WebUSB 或 desktop BLE 的量级。

### FileWrite 窗口：同一次调用内 2 块在途

一问一答时，设备处理当前块、回包的这段时间里 BLE 链路是空闲的。`FirmwareUpdateV4` 可以在
同一次 `FilesystemFileWrite` 调用内提前发出下一块，最多 `2` 块在途（`PROTOCOL_V2_FILE_WRITE_PIPELINE_WINDOW`）：

- 回包按顺序匹配在途块并回显 path/offset/total size、`Failure` 排空后返回且 Link 可用、
  用户取消或读源失败不使 Link 失效、Transport 不重发而由 Core 从偏移 `0` 重写整个文件，这些规则见
  [Protocol V1/V2](../protocol/protocol-v1-v2.md#link-sequence-and-call-queue) 和
  [架构决策](../architecture/decisions.md#ordered-filewrite-pipeline-for-ble-firmware-transfer)。进度只按已确认的块累计。
- 主控先把整帧从 UART FIFO 拷出再处理（firmware-pro2 `proto_link.c`），但“等着被解析的一帧”和
  “正在接收的下一帧”可能同时在 FIFO 里，蓝牙芯片自己的命令帧也走同一个 FIFO。所以窗口模式下所有文件
  统一用 `1800B` 块，两帧约 `3.75KB`；串行时 staging 路径用的 `1960B` 块单帧最多 `2020B`，两帧只剩不到
  `60B` 余量。旧 bootloader 的 `2048B` FIFO 只放得下一帧。
- 蓝牙芯片同样限制窗口：1.0.23 把每个收到的 BLE 包放进 10 个事件的调度队列，满了直接丢弃不报错，
  转发到主控的 UART 也没有流控。2 块在途时（窗口模式每块 `1800B`、每帧 8 包）BLE 芯片里可能同时有约 16 个
  `244B` 包，一问一答时 8–9 个（串行 staging `1960B` 块每帧 9 包），
  主循环卡顿时更容易丢包。开启前需要固件确认余量，并在真机上做长时间传输验证。
- `2048B` BLE 帧上限保持不变：蓝牙 1.0.23 只对不超过 `2048B` 的帧做 passthrough
  session 保护，帧更大时，蓝牙自身的命令可能插进一帧中间。
- 传输由设备**当前**运行的 bootloader 接收，不是这次要安装的那个。SDK 只在 React Native 与 Electron BLE、
  bootloader 模式、且运行中的 bootloader 版本不低于 `PROTOCOL_V2_BLE_FILE_WRITE_WINDOW_MIN_BOOTLOADER_VERSION` 时开启；
  LowLevel（包括 CLI）不开启。这个常量当前为 `1.0.4`：线上 bootloader（`1.0.2`，FIFO 为 `2048B`；以及 `1.0.3`）保持
  一问一答，所以线上设备第一次升级（从旧 bootloader 装上新 bootloader 的那一次）也是一问一答。SDK 要求固件从 `1.0.4` 起带
  `4096B` FIFO，固件尚未确认；任何报告 `1.0.4` 及以上的 bootloader 都会开窗口。之前刷了 `4096B` FIFO、但仍报告 `1.0.2` 的
  测试 bootloader 现在也走一问一答，要换成报告 `1.0.4` 的测试包才开窗口。
  设为 `undefined` 则全部一问一答。原因见
  [架构决策](../architecture/decisions.md#ordered-filewrite-pipeline-for-ble-firmware-transfer)。
- `2048B` FIFO 上若开窗口：设备还没把等着解析的一帧拷出去时下一帧就到了，放不下的字节被直接丢掉（固件只打印
  `fifo overflow`，不回错误）。残帧过不了 CRC 被丢弃，这一块收不到回包或后续块的确认对不上，SDK 在 `10s` 内判链路失效。
  按固件 `proto_link.c` 与 SDK 逻辑推出，未在 `2048B` FIFO 的线上 bootloader 上实测。
- 窗口模式与设备的交互失败后（传输调用失败，或最后的确认没有覆盖整个文件），Core 重连并从偏移 `0` 重写该文件，且本次升级
  剩下的写入（这个文件的重试和之后所有文件）都改为一问一答；读取固件源失败与 bootloader 无关，保留窗口。门控误开在放不下
  两帧的 bootloader 上时，通常只占用这个文件 `3` 次尝试中的一次和一次重连；如果这次重连或剩下的串行尝试也失败，升级仍会失败。
- 测速时按 `[FirmwareUpdateV4]` 过滤 SDK debug 日志：`BLE FileWrite window` 记录是否开启及 bootloader
  版本/build ID；`Protocol V2 file transferred` 记录每个文件的字节数、耗时、第几次尝试和窗口大小；
  `file transfer attempt failed` 记录文件内重传；`transfer completed` 与 `install completed` 分别给出传输
  阶段与安装阶段（含设备上确认）的总耗时。
- 每一步等待（写一帧、等一块的回包）最长 `10s`，React Native 与 Electron BLE 相同；超时后 Link 失效，
  Core 重连并重写该文件。串行路径的超时不变（桌面仍为默认 5 分钟）。

下面是不加 credit 的实测：除标注 app 模式的一行外都在 `4096B` FIFO 测试 bootloader 下测；
单位 KiB/s（单文件有效字节 ÷ 首帧到最后一个确认的时间），标注百分比的是传输中途的实时值：

| 主机 / 工具                                        | 设备与模式           | 文件               | 窗口 / 块                   | 结果                     | RTT       |
| -------------------------------------------------- | -------------------- | ------------------ | --------------------------- | ------------------------ | --------- |
| macOS Electron + SDK alpha.113（整包升级，改块前） | Neo，bootloader      | 21 个文件，27.9 MB | 2 / 资源 1800、staging 1960 | 单文件 `42.2–43.4`       | —         |
| macOS 固件同事的 `ble_tool.py`                     | Neo，bootloader      | P2，`1646018B`，×3 | 1 / 1800                    | 中位 `31.6`              | `55ms`    |
| 同上                                               | 同上                 | 同上               | 2 / 1800                    | 中位 `42.4`              | `83ms`    |
| 同上                                               | 同上                 | 同上               | 2 / 1960                    | 中位 `43.0`              | `88ms`    |
| 同上                                               | 同上                 | 同上               | 3 / 1800                    | 中位 `46.3`              | `114ms`   |
| 同上                                               | Pro2，bootloader     | `1734826B`，×5     | 2 / 1800                    | 中位 `43.8`              | `77–84ms` |
| Android（Pixel 9a）同事的工具 APK                  | bootloader，机型未记 | P2，`1646018B`     | 2 / 1800                    | `55.0`（第 1 次 22% 时） | `58ms`    |
| Windows 同事的 `ble_tool.py`                       | Pro2，app 模式       | 5 MB 随机文件      | 2 / 1800                    | `62.6`（第 1 次 96% 时） | `55ms`    |

- 同一台 Mac、同一台设备上，SDK alpha.113（staging 文件 `1960B` 块）与 demo 速度一致，SDK 每块带
  `ui_percentage` 和 Electron 进程间转发都看不出开销。窗口模式全部改为 `1800B` 块后 macOS 上尚未做端到端实测
  （Android App 的 alpha.115/116 实测见下文）；同机 demo 的 2/1800 比 2/1960 低约 1.4%（`42.4` 对 `43.0`），
  在测量波动内。
- macOS 上窗口 1 到 2 只提升约 34%，RTT 从 `55ms` 涨到 `83ms`；Neo 窗口 3 每块约 `37.9ms`，帧字节约
  `48.6 kB/s`（约 `47.4 KiB/s`）。Pro2 在窗口 2 时（`43.8`，RTT `77–84ms`）与 Neo 一致。Android 与 Windows
  在窗口 2 时 RTT 仍约 `55–58ms`，说明上限在 macOS
  主机链路（连接间隔由系统决定，之前测得 `15ms`），不在设备或 SDK。iOS 同样由 CoreBluetooth 决定连接
  参数，需要单独实测。
- alpha.115 时（逐包模式），同事的 Android 工具与 SDK 在 Android 上的写法一致：请求 MTU `517`（实际 `247`）、HIGH 连接优先级、
  `244B` write-without-response、每包等 `onCharacteristicWrite` 再发下一包。区别在等待发生的位置：工具在 Java
  线程里等，SDK 每个包都要从后台 JS 线程到原生再回来一次。OneKey App（Pixel 9a、alpha.115、窗口 2）整包传输
  `41,082 B/s`（约 `40.1 KiB/s`，无重传），同机工具 `55–60 KiB/s`。Android 一次只允许一个 GATT 写在途，所以
  这段往返夹在每两个包之间；iOS 会先排队多个无回复写，往返多半和空中时间重叠，可能仍受链路限制。这次没有抓 HCI，
  而 alpha.115 到第一次 FileWrite 才请求 HIGH（连接已建立很久）；如果当时已是 Android 17，链路可能停在 latency `1`
  （见下一节），所以这段差距不能全部归因于 JS 往返。现在默认改为整帧原生写入，Android API `37` 及以上也默认不再请求 HIGH。
- 因此 React Native 加了整帧原生写入（见 [Protocol V1/V2 · BLE Transport](../protocol/protocol-v1-v2.md#ble-transport)），
  `ProtocolV2BleTuning.nativeFrameWrite` 可关闭用于同包 A/B。每次带窗口的 FileWrite 结束时，
  `[ReactNativeBleTransport] FileWrite perf` 记录 `mode`（`native-frame` / `per-packet`）、帧数、包数、`writeMs`、
  `readWaitMs`，逐包模式还有每包耗时分布；`Protocol V2 frame write mode` 记录当前链路用哪种模式。App 会保存这两条
  日志，按文件比较两种模式即可。
- 刷了开发版测试 bootloader（`__DEV__DEBUG`，包头 production flag 为 `0`）的设备只接受开发签名的包。
  App 预览环境下发的 `prod_release` 包（production flag `0xA55A5AA5`）能传完，但安装时每个目标都以
  `FAILED_VERIFY`（`6`）失败，什么都不会装上。测完整升级要给这类设备配开发签名的包。

### Android 17 连接优先级：peripheral latency 1 让吞吐减半

2026-10-24 用 Pixel 9a（Android 17）+ Neo（bootloader 1.0.2 测试版、BLE 1.0.23）抓 HCI snoop 测得。前两行是同事的工具 APK，
后两行是同一个 App 包（alpha.116、native-frame、窗口 2 / 1800）前后两次整包升级：

| 场景                                      | 连接参数（HCI）     | 结果                                                 |
| ----------------------------------------- | ------------------- | ---------------------------------------------------- |
| 工具连上后立即上传，同一条连接内对比      | `15ms`，latency `1` | `33.9 KiB/s`，每帧 8 包全部被确认的耗时中位 `84.5ms` |
| 同上，设备把参数改回后                    | `15ms`，latency `0` | `56.7 KiB/s`，同口径中位 `43.3ms`                    |
| App 升级，HIGH 在连接建立 `104s` 后才请求 | 推断 latency `1`    | 6 个文件全部 `27.6–29.2 KiB/s`，每帧 `66.1ms`        |
| App 升级，latency `0` 阶段                | `15ms`，latency `0` | 单文件约 `55 KiB/s`，每帧 `33.1ms`                   |

- Android 17（Bluetooth 模块开启 `le_subrate_manager`）把 `CONNECTION_PRIORITY_HIGH` 映射成 `11.25–15ms`、
  peripheral latency `1`（AOSP `CompanionManager` 默认值，不是 Pixel 定制），BALANCED 是 `30–50ms`、latency `5`。
  Android 16 及更早的 HIGH 仍是 latency `0`。
- BLE 1.0.23 连接时自己请求 `15/15ms`、latency `0`，但接受检查只看连接间隔（latency 允许偏差 `499`），所以会接受
  latency `1`；`15ms` latency `1` 下设备时有时无地错过连接事件，吞吐降到 latency `0` 时的 `0.5–0.6` 倍。
- 固件只靠一个重试定时器把参数改回 `15/0`：手机连接后先改成 `48.75ms` 会启动它，约 `30s` 后触发。HIGH 在这之前请求，
  前约 `30s` 慢、之后恢复；在这之后请求（升级时主芯片重启进 bootloader 不断开 BLE，第一次大流量调用总在这之后），
  latency `1` 会留到连接结束。
- 在建立已久的连接上请求 HIGH，4 次里有 3 次约 `5s` 后监督超时断开（reason `0x08`），原因未查清，和第一次读 RESC 文件头
  同时发生。断开后 RESC 头检查全部失败，原本已是最新的资源包全部重传（多传约 `22 MB`）。
- SDK 因此在 Android API `37` 及以上默认不请求 HIGH，交给设备自己的 `15/0`；
  `ProtocolV2BleTuning.androidHighConnectionPriority` 可设为 `true`/`false` 强制开关，默认 `'auto'`。更早的 BLE 固件
  （1.0.21/1.0.22 请求 `15–30ms`，更早的不请求）在 Android 17 上不请求 HIGH 时的速度尚未实测。
- 验证方法：开发者选项里把“蓝牙 HCI 信息收集日志”设为“已启用”并重启蓝牙，传输后尽快 `adb bugreport` 取
  `FS/data/misc/bluetooth/logs/btsnoop_hci.log*`（每 `65536` 条记录滚动一次，只保留两份）。看 LE Connection Update
  Complete 的 interval/latency 与 L2CAP Connection Parameter Update Request 的时间点。

### alpha.117 端到端结果

2026-10-24，Neo（bootloader 1.0.2 测试版、BLE 1.0.23），App 整包升级（native-frame、窗口 2 / 1800），资源包已是最新、
只传 6–7 个固件文件。单位 KiB/s 按帧字节计：

| 平台                            | 环境                | 单文件      | 每帧周期  | 说明                                         |
| ------------------------------- | ------------------- | ----------- | --------- | -------------------------------------------- |
| Android（Pixel 9a，Android 17） | 家中 5 GHz Wi-Fi    | `53.4–55.1` | `33ms`    | 连接后 `1.4s` 即为 `15ms` latency `0`        |
| 同上                            | iPhone 2.4 GHz 热点 | `28.5–39.7` | `54–63ms` | 参数同为 `15ms` latency `0`，见下            |
| iOS                             | 家中                | `73.2–75.5` | `24ms`    | 整帧写 `2.7ms`，排队的无回复写与空中时间重叠 |

- 2.4 GHz 那次 BQR（vendor event `0xFF`）显示 AFH 弃用 `22/37` 个信道、上行重传约 `38%`，家中为 `10/37`、约
  `11%`，RSSI 都约 `-51`–`-52dBm`。Pixel 的 Wi-Fi 与蓝牙共用射频，2.4 GHz Wi-Fi 会挤占连接事件：每个事件只能发约 2 包
  （家中 3–4 包）。比较速度时要固定射频环境。
- Android 连接后系统自己的 GATT 发现（`dumpsys bluetooth_manager` 里 `ACL holders: bta_dm_disc_gatt`）正常 1–3 s
  释放。2.4 GHz 环境下它曾在设备装完重启后一直占住链路、不超时也不断开，SDK 的重连无法恢复，只能关开蓝牙；这不是
  吞吐问题，单独跟进。
- 尚未覆盖：Pro2 的 App 实测、BLE 1.0.22 及更早固件在 Android 17 上不请求 HIGH 时的速度、Electron 桌面端。

## SDK 可靠性与事件开销

`FirmwareUpdateV4` 的单个文件传输失败后，Core 重连、校验物理设备身份并初始化，然后从偏移 `0`
覆盖重写整个文件，单个文件最多尝试 `3` 次。SDK 目前没有按已确认偏移续传。副作用命令的重试由
Core 决定，不下沉到 Transport。CLI 输出的 `attempt`、`retried` 只描述外层 CLI 重试，看不出这种
文件内的重写，判断有无重传需要按文件核对实际写入字节。

RESC 头检查遇到断链时（如上面 Android 17 一节的监督超时），Core 重连后重新检查（读头没有副作用）。
每个传输阶段共享最多 `2` 次重连，次数用完后，再次断链的资源包按旧逻辑直接重传。重连本身失败（连不上、
身份校验不一致，或者查询身份的 `DeviceInfoGet` 失败）则中止升级，与文件传输重试的恢复一致：重连会替换会话，
没有重新确认身份的设备不能再写入。

文件写入的内部确认回调在每个确认后触发，用于记录真实吞吐；App 可见的
`FIRMWARE_PROGRESS` 则只在整数百分比变化、超过 `1s` 心跳间隔或单文件完成时发送。这样可减少
RN bridge 和 Desktop renderer 的高频事件开销，不影响确认偏移的精度。

## 判断方法

- 如果 raw write 明显高于 SDK 固件升级速率，瓶颈在 `FilesystemFileWrite` 的设备处理和协议 ACK。
- 如果 raw write 自身很低，瓶颈在 RN BLE / iOS BLE / `react-native-ble-plx` 写入队列。
- 如果 Ping RTT 很低但固件升级慢，瓶颈更偏设备端文件系统或 flash 写入。
- 如果 Ping RTT 接近 `180-220ms`，则 `1800B` 下 `8-10 KB/s` 属于当前串行模型的自然结果。
