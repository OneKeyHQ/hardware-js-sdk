
# Electron Connect Example

此示例使用 `@onekeyfe/hd-common-connect-sdk` 的 `desktop-web-ble` 环境，并通过 Electron
Noble BLE Transport 连接设备。示例不再启动 OneKey Bridge，也不再注入 `hd-web-sdk` iframe。

Pro2 会在真实连接响应中完成 Protocol V2 探测；应用层不要根据 BLE 名称或设备型号猜测协议。
连接后的 SDK 调用和自动化测试沿用 `expo-example` 的 Core API，因此 V1 与 V2 共用同一套生命周期。

开发运行：

```bash
yarn example:desktop
```

打包前会先构建 Electron 主进程和 Expo Web 资源：

```bash
yarn build:example:desktop:mac
```

## Q & A

## The mac running message is damaged and cannot be opened. You should move it to the trash.
### Intel Mac
1. Open settings
2. Security & Privacy
3. Security
4. Allow apps downloaded from: App Store and identified developers
5. Open the app again

### Apple Silicon Mac
1. Open terminal
2. Run the following command
```bash
sudo /usr/bin/xattr -c /Applications/YourAppName.app
```

### If the above command does not work, try the following command
```bash
sudo xattr -r -d com.apple.quarantine /Applications/YourAppName.app
```
