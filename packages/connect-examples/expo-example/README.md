# Connect Example

浏览器端统一通过 WebUSB 直连 OneKey 硬件，不再依赖 OneKey Bridge 或 iframe Connect 服务。
iOS 与 Android 构建仍使用各自的 React Native BLE Transport。

## 支持范围

- Classic、Mini、Touch、Pro 等 Protocol V1 设备。
- Pro2、Neo Protocol V2 设备。
- 浏览器授权、协议主动探测、初始化、业务调用和断开清理均由当前仓库的
  `@onekeyfe/hd-common-connect-sdk` 与 WebUSB Transport 完成。

协议不能根据 PID、产品名或 USB descriptor 直接判定。示例展示的 `V1` / `V2` 来自设备连接后的
真实响应探测结果。

## 运行

WebUSB 需要安全上下文和浏览器支持。请使用 Chromium 系浏览器，并通过 HTTPS 或 localhost 访问：

```bash
yarn example:web
```

点击“Search Device”后完成浏览器授权。成功列表至少应显示设备型号、连接 ID 与已确认的协议版本。

## 最小真机回归

1. 使用一台 Protocol V1 设备授权并搜索，确认列表显示 `V1`，随后执行一次 `getFeatures`。
2. 分别使用一台 Pro2 和一台 Neo 授权并搜索，确认列表显示 `V2`，随后执行一次支持 Protocol V2 的公开方法。
3. 分别断开 Protocol V1 和 Protocol V2 设备并重新搜索，确认旧连接不会继续接收响应。
4. Pro2 或 Neo 请求 PIN 时只在设备上完成操作；示例不会向 Protocol V2 回传 V1 的 `RECEIVE_PIN`。
