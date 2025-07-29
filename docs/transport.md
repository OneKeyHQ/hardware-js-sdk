# OneKey 传输层通讯架构详解

## 0. 通讯架构设计原理

### 0.1 为什么需要三层分离？

**🎯 核心问题：**
跨平台硬件钱包通讯的复杂性：不同平台（Web/Mobile/Desktop）、不同协议（USB/BLE/HTTP）、不同业务（Bitcoin/Ethereum/etc.）需要统一抽象。

**📐 分层解决方案：**
```
业务层 (@onekeyfe/core)
├── 职责：区块链业务逻辑，参数验证，方法生命周期
├── 隔离：不感知传输细节，不处理UI交互
└── 接口：BaseMethod 抽象类确保一致性

传输层 (@onekeyfe/hd-transport)  
├── 职责：消息序列化，协议编码，通讯抽象
├── 隔离：不知道具体业务，不关心物理传输
└── 接口：Transport 统一接口

平台层 (HTTP/WebUSB/BLE)
├── 职责：物理通讯实现，平台适配
├── 隔离：只关心数据传输，不理解消息含义
└── 接口：相同的传输协议适配
```

**💡 设计决策的驱动因素：**
1. **可扩展性**：新增区块链不影响传输层
2. **可维护性**：层间故障不传播  
3. **跨平台性**：相同业务逻辑适用所有平台
4. **协议演进性**：传输协议升级不破坏业务层

## 1. 通讯协议设计

### 1.1 消息协议格式

**🔗 协议帧结构：**
```
[魔术头:2bytes][消息类型:2bytes][长度:4bytes][负载:Nbytes]
[0x23][0x23]   [MessageType]   [Length]     [Protobuf Data]
```

**为什么这样设计？**
```
魔术头 (0x23 0x23)：消息边界检测 + 传输错误检测
├── 选择 "#" 字符：可打印，调试友好
├── 双字节重复：增强错误检测能力
└── 固定位置：快速协议验证

消息类型 (2bytes)：Protobuf 消息路由
├── 无需解析负载即可分发消息
├── 支持 65536 种消息类型
└── 向后兼容的消息版本机制

长度前缀 (4bytes)：接收缓冲区预分配
├── 避免动态内存重分配
├── 支持最大 4GB 消息（实际受限于硬件）
└── 大消息分块传输支持
```

### 1.2 分块传输机制

**⚡ USB HID 限制与解决：**
```
硬件限制：USB HID 报文 = 64 bytes
可用空间：64 - 1(report ID) = 63 bytes 净负载
分块策略：大消息自动切片为 63 字节块

分块算法：
├── 计算块数：Math.floor((totalSize - 1) / 63) + 1
├── 顺序传输：按块顺序发送，接收端重组
├── 边界处理：最后一块可能不满 63 字节
└── 完整性：通过长度字段验证重组正确性
```

**核心编码逻辑：**
```typescript
// 协议编码：业务数据 → 传输帧
const fullSize = HEADER_SIZE + protobufData.length;
const frame = [0x23, 0x23, messageType, length, ...protobufData];

// 分块处理：大帧 → 多个 63 字节块  
const chunks = [];
for (let i = 0; i < frame.length; i += 63) {
  chunks.push(frame.slice(i, i + 63));
}
```

## 2. 会话管理机制

### 2.1 设备会话设计

**🔐 会话状态管理：**
```typescript
// 全局会话缓存：防止多实例冲突
const deviceSessionCache: Record<string, string> = {};

// 设备会话属性
class Device {
  mainId?: string | null;           // 会话标识符
  keepSession = false;              // 会话保持控制
  passphraseState: string;          // Passphrase 会话状态
  deviceAcquired = false;           // 设备占用标记
}
```

**为什么需要会话管理？**
```
独占性要求：硬件设备同时只能被一个应用访问
├── USB 设备：操作系统层面的独占访问
├── BLE 设备：应用层协议独占
└── 会话冲突：多个 SDK 实例需要协调

状态一致性：设备状态在会话期间保持稳定
├── 固件特性：features 在会话期间不变
├── 协议版本：messageVersion 会话期间固定
└── 配置状态：PIN/Passphrase 状态一致
```

### 2.2 会话生命周期

**📋 标准会话流程：**
```
1. enumerate() → 发现可用设备
   ├── USB：枚举 HID 设备
   ├── BLE：扫描特征服务
   └── HTTP：查询 Bridge 设备列表

2. acquire() → 获取设备独占访问
   ├── 生成 session ID
   ├── 设置设备占用标记
   └── 返回会话令牌

3. configure() → 配置设备通讯协议
   ├── 获取设备 features
   ├── 选择消息协议版本
   └── 初始化 Protobuf 消息定义

4. call() → 执行业务方法
   ├── 编码 Protobuf 消息
   ├── 发送到设备并等待响应
   └── 解码响应消息

5. release() → 释放设备会话
   ├── 清除占用标记
   ├── 清理会话缓存
   └── 设备可被其他应用使用
```

### 2.3 会话保持策略

**⚡ keepSession 机制：**
```
设计目的：相关操作复用会话，减少 acquire/release 开销

触发条件：
├── 批量操作：getAddress 连续调用
├── 交易签名：多输入需要多次用户确认
├── 固件升级：多阶段操作需要保持连接
└── Passphrase 状态：避免重复输入密码

实现原理：
device.keepSession = true;  // 方法执行前设置
await method.run();         // 执行业务逻辑
// 会话在方法结束后保持，不自动 release()
```

## 3. Passphrase 状态管理

### 3.1 Passphrase 分层处理

**🔑 多层 Passphrase 架构：**
```
业务层 (BaseMethod)：
├── useDevicePassphraseState = true  // 声明需要 passphrase
├── 方法执行前验证 passphrase 状态
└── 不直接处理 passphrase 输入

设备层 (Device)：
├── passphraseState: string         // 缓存 passphrase 状态
├── getPassphraseStateWithRefreshDeviceInfo() // 状态获取与刷新
└── 管理 passphrase 会话生命周期

传输层 (DeviceCommands)：
├── DEVICE.PASSPHRASE 事件分发    // UI 交互事件
├── PassphrasePromptResponse 处理  // 用户输入响应
└── 与设备固件的 passphrase 协议交互
```

**为什么分层处理？**
```
业务与UI分离：
├── 核心业务逻辑不依赖具体UI实现
├── 不同平台可有不同的 passphrase 输入方式
└── 测试环境可模拟 passphrase 输入

状态缓存优化：
├── 避免相同 passphrase 重复输入
├── 会话期间 passphrase 状态保持
└── 不同设备型号的 passphrase 处理差异抽象化
```

### 3.2 Passphrase 状态缓存

**🗃️ 状态缓存机制：**
```typescript
// Passphrase 状态获取与缓存
const getPassphraseStateWithRefreshDeviceInfo = async (device: Device) => {
  // 1. 检查是否需要 passphrase
  if (!features.passphrase_protection) return null;
  
  // 2. 获取或刷新 passphrase 状态
  const { passphraseState } = await device.commands.getPassphraseState();
  
  // 3. 缓存状态到设备对象
  device.passphraseState = passphraseState;
  
  // 4. 同步设备特性信息
  await device.getFeatures();
};
```

**缓存设计原则：**
```
安全性：Passphrase 状态不持久化
├── 内存缓存：只在会话期间有效
├── 进程隔离：不同应用间状态隔离
└── 会话结束自动清理

性能优化：避免重复用户交互
├── 状态复用：相同 passphrase 多次使用
├── 批量操作：一次输入支持多个方法
└── 智能刷新：只在必要时重新获取状态
```

## 4. 业务层通讯设计

### 4.1 BaseMethod 模式

**🏗️ 统一方法模板：**
```typescript
abstract class BaseMethod<Request, Response> {
  // 业务参数验证
  abstract validateParams(): void;
  
  // 设备兼容性检查  
  abstract getVersionRange(): Record<string, string>;
  
  // 核心业务逻辑
  abstract run(): Promise<Response>;
  
  // 会话管理配置
  useDevicePassphraseState?: boolean;
  useEmptyPassphrase?: boolean;
  skipFinalReload?: boolean;
}
```

**为什么使用模板方法模式？**
```
一致性保证：所有 API 方法行为统一
├── 相同的参数验证流程
├── 统一的错误处理机制
├── 一致的设备兼容性检查
└── 标准的会话管理

扩展性：新增方法只需实现核心逻辑
├── 框架处理通用逻辑（会话、验证、错误）
├── 开发者专注业务逻辑实现
└── 自动获得所有框架特性
```

### 4.2 设备特性适配

**📱 设备差异化处理：**
```typescript
// 协议版本选择
const getSupportMessageVersion = (features?: Features) => {
  const deviceType = getDeviceType(features);
  
  // 不同设备支持不同协议版本
  if (deviceType === 'classic1s') return { version: 'v1', messages: MESSAGES_V1 };
  if (deviceType === 'touch') return { version: 'v2', messages: MESSAGES_V2 };
  if (deviceType === 'pro') return { version: 'v3', messages: MESSAGES_V3 };
};

// 动态协议重配置
async reconfigure(features?: Features) {
  const { messageVersion, messages } = getSupportMessageVersion(features);
  
  // 避免不必要的重配置
  if (this.currentMessages === messages) return;
  
  // 更新传输层协议配置
  await this.transport.configure(messages);
  this.currentMessages = messages;
}
```

**特性适配原则：**
```
向后兼容：新版SDK支持旧设备
├── 协议版本自动检测
├── 特性降级使用
└── 优雅的不支持特性处理

设备差异抽象：
├── Touch 屏幕确认 vs Classic 按键确认
├── Pro 设备的高级特性支持
└── 不同固件版本的 bug 修复
```

## 5. 传输层协议栈

### 5.1 协议分层设计

**📡 协议栈层次：**
```
应用协议层：Protobuf 消息定义
├── Bitcoin/Ethereum/etc. 特定消息
├── 通用设备管理消息
└── 版本化的消息兼容性

传输协议层：OneKey 自定义协议
├── 消息帧格式 [Header|Type|Length|Payload]
├── 分块传输机制
└── 错误检测与恢复

物理协议层：平台特定协议
├── USB HID：64 字节报文
├── BLE GATT：可变长度特征值
└── HTTP：JSON over WebSocket
```

**为什么需要协议分层？**
```
职责分离：每层专注自己的问题域
├── 应用层：业务逻辑语义
├── 传输层：可靠数据传输
└── 物理层：具体通讯实现

可替换性：层间接口稳定
├── 可更换物理层（USB→BLE）而不影响应用
├── 可升级传输协议而不破坏兼容性
└── 可扩展应用协议而不影响传输
```

### 5.2 错误处理与重试

**🚨 分层错误处理：**
```
物理层错误：USB 断开、BLE 信号弱、HTTP 超时
├── 自动重试：短暂网络问题
├── 连接恢复：设备重新插拔
└── 传输切换：HTTP Bridge → WebUSB

传输层错误：协议格式错误、消息校验失败
├── 消息重发：临时传输错误
├── 协议降级：不兼容的消息版本
└── 会话重建：协议状态不一致

应用层错误：设备拒绝、用户取消、参数无效
├── 用户交互：PIN 输入错误重试
├── 参数调整：不支持的参数组合
└── 状态恢复：Passphrase 状态过期
```

**智能重试策略：**
```typescript
// 指数退避重试
const retryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,    // 1秒
  maxDelay: 30000,    // 最大30秒
  backoffFactor: 2    // 指数因子
};

// 错误分类处理
if (isTransientError(error)) {
  await delay(calculateBackoff(attempt));
  return retry();
} else if (isRecoverableError(error)) {
  await recoverConnection();
  return retry();
} else {
  throw error; // 不可恢复错误
}
```

## 6. 缓存与状态管理

### 6.1 多级缓存架构

**🗄️ 缓存层次设计：**
```
全局设备缓存：deviceSessionCache
├── 用途：防止多实例会话冲突  
├── 生命周期：进程级别
└── 清理：进程退出时自动清理

设备状态缓存：Device.features/passphraseState
├── 用途：避免重复的设备查询
├── 生命周期：设备会话期间
└── 刷新：features 变化时主动刷新

协议消息缓存：currentMessages
├── 用途：避免重复的协议重配置
├── 生命周期：传输连接期间  
└── 更新：设备特性变化时更新
```

**为什么需要多级缓存？**
```
性能优化：减少昂贵的操作
├── 设备特性查询：固件交互开销大
├── 协议重配置：消息解析开销大
└── 会话建立：设备占用协商开销大

一致性保证：状态同步
├── 设备状态：多个方法见到一致的设备状态
├── 协议状态：消息版本在会话期间稳定
└── 会话状态：避免会话冲突和泄露
```

### 6.2 状态一致性机制

**🔄 状态同步策略：**
```typescript
// 设备状态刷新机制
class Device {
  featuresNeedsReload = false; // 显式重载标记
  
  async getFeatures(reload = false) {
    // 强制重载或标记需要重载时才查询设备
    if (reload || this.featuresNeedsReload) {
      this.features = await this.commands.getFeatures();
      this.featuresNeedsReload = false;
    }
    return this.features;
  }
  
  // 状态变化时标记需要重载
  markFeaturesNeedsReload() {
    this.featuresNeedsReload = true;
  }
}
```

**状态一致性原则：**
```
显式更新：状态变化必须显式触发
├── 避免隐式的状态轮询
├── 明确的状态变化时机
└── 可预测的状态行为

懒加载：按需获取状态
├── 避免不必要的设备交互
├── 减少初始化开销
└── 提高响应速度

版本控制：状态变化版本化
├── featuresNeedsReload 标记状态过期
├── 协议版本控制消息兼容性
└── 会话版本避免状态冲突
```

---

**🔗 传输层架构核心价值：**

OneKey 传输层通过精心设计的三层架构、协议栈、会话管理和缓存机制，成功解决了跨平台硬件钱包通讯的复杂性。其核心创新在于：

**架构创新：**
- **分层隔离**：业务、传输、物理层职责清晰，互不干扰
- **协议设计**：自定义传输协议适配多种物理层限制
- **会话管理**：独占访问与状态一致性的平衡
- **缓存优化**：多级缓存减少设备交互开销

**设计原则：**
- **向后兼容**：协议演进不破坏现有功能
- **错误恢复**：分层错误处理与智能重试
- **状态管理**：显式状态更新与一致性保证
- **性能优化**：会话复用与协议缓存

通过这种架构设计，OneKey SDK 在保证通讯可靠性的同时，为开发者提供了简洁统一的 API 接口。