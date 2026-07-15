# ADR-004：受保护方法采用显式单次解锁重试

> - 状态：已采纳
> - 决策日期：2026-07-14
> - 最后核验：2026-07-15
> - 适用范围：需要设备解锁的 Protocol V2 Core Method

## 背景

Protocol V2 的设置读取、设置写入和设备设置页等方法可能在设备锁定时返回 `DeviceLocked`。调用前查询锁定状态存在竞态，也无法准确表达字段级权限；对所有方法自动解锁又会产生不可预期的用户交互和副作用重试。

## 决策

- `BaseMethod` 默认使用 `unlockPolicy = 'none'`。
- 允许自动解锁的方法必须显式声明 `unlockPolicy = 'retry-on-locked'`。
- Core 首次执行方法；只有收到结构化 `HardwareErrorCode.DeviceLocked` 时才触发设备解锁。
- 解锁成功后原方法最多重试一次；第二次失败原样返回，禁止循环解锁。
- 解锁取消或失败时不执行原方法重试。
- Protocol V1、未声明策略的方法和其他错误不进入该流程。
- `DeviceLocked` 优先依据 Protocol V2 Failure 的 code/subcode 映射，固件消息文本只作为兼容回退。

## 结果

- 是否允许用户可见的 PIN 交互可以在方法级审计。
- 固件负责实时判断方法或字段是否需要解锁，SDK 不维护易漂移的权限白名单。
- 具有不可重试副作用的方法不会被默认重发。

## 实现位置

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/protocols/protocol-v2/unlockRetry.ts`
- `packages/core/src/device/DeviceCommands.ts`
