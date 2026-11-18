# OneKey Electrum 插件

本目录是 OneKey Pro 2 / Neo 独立 Electrum ZIP 插件的维护入口。Electrum 的 Qt 插件由 Python 加载，因此源码和测试使用 Python；它不依赖 SDK 的 TypeScript 运行时，也不参与 Yarn workspace 和 npm 发包。

## 支持范围

- Electrum 4.8.4 起的桌面 Qt 界面。
- 已完成初始化的 Pro 2 / Neo，Protocol V2，USB 连接。
- 单签 Legacy、Nested SegWit 和 Native SegWit Bitcoin / Testnet 钱包。
- 导入公钥、设备端核对地址、交易签名，以及设备端 PIN / passphrase 交互。

插件包含固件能力检查修复：`ProtocolInfo.supported_messages` 报告的是 C 管理指令，不能据此拒绝由 MicroPython 处理的 Bitcoin 指令。读取钱包前会校验设备身份和钱包 Session；失效、中断或钱包不匹配时中止，不自动重放签名请求。

Pro 2 的 USB 识别和协议握手已完成真机验证；两款设备的完整地址、隐藏钱包、签名及重连验收仍需完成。

## 构建 ZIP

构建只需要 Python 3.11 或更新版本，不需要安装 SDK 的 JavaScript 依赖：

```sh
cd plugins/electrum
python3 build.py
```

产物位于 `dist/onekey-<version>.zip`。版本只在 `onekey/manifest.json` 中维护；构建脚本自动读取版本，并将插件源码、图标、许可证和 Linux USB 规则一起打包。构建产物不提交 Git。

## 安装与升级

1. 使用 Electrum 4.8.4 或更新版本的官方桌面发行包。
2. 新建钱包，选择硬件钱包，在设备选择页点击 **Add plugin**，从插件管理器导入 ZIP。
3. 按 Electrum 提示设置插件授权密码并授权安装。升级已安装插件后，完全退出并重开 Electrum。
4. 连接设备，重新扫描并继续钱包向导。

ZIP 使用 Electrum 官方发行包已包含的 `trezorlib` 和 `libusb1` Python 模块；版本约束和缺少依赖的错误由插件检查。使用 Electrum 源码环境时，需要自行安装其硬件依赖。

Linux 用户还需将 ZIP 内的 `onekey/56-onekey.rules` 安装到 `/etc/udev/rules.d/`，重新加载 udev 规则后重新插拔设备。该规则仅匹配 `1209:4f4c`，使用 `uaccess` 或 `plugdev` 授权 USB 访问。

## 开发与验证

系统需提供 libusb 1.0；libsecp256k1 按 Electrum 上游安装要求准备。Python 开发环境与 SDK 的 Node 依赖分开维护：

```sh
cd plugins/electrum
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
python -m flake8 onekey tests build.py --select=E9,F63,F7,F82
python build.py
```

测试使用模拟传输及合成交易，覆盖 USB 帧、CRC、型号识别、会话恢复、取消、地址不匹配、单签交易转换和 ZIP 首次加载。ZIP 加载测试直接使用本目录的构建产物和 Electrum 的外部插件导入器，无需把源码复制进 Electrum 仓库。

协议定义以 `submodules/firmware-pro2/sys/protobuf/onekey_protocol/` 为准。本插件的管理消息子集在 `onekey/messages.py`，USB 帧实现在 `onekey/transport.py`；更新这些定义时需同时核对固件字段和消息编号。

维护时修改本目录的源码和测试，再重新打包。涉及钱包、解锁或签名行为的改动需要聚焦测试和安全检查；不要记录真实设备的钱包会话、PIN、passphrase 或签名请求。
