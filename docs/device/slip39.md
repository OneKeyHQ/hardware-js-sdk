# OneKey SLIP-39 技术说明

> - 文档状态：当前仓库实现说明
> - 最后代码核验：2026-07-15
> - 事实来源：`submodules/firmware/core/src/trezor/crypto/slip39.py`、对应测试向量与 Protocol 消息类型
> - 维护要求：升级 SLIP-39 实现或引入 extendable backup 新格式后重新核验。

## 1. 核心概念

SLIP-39 使用 Shamir Secret Sharing 将一个秘密拆分为多份助记词，并允许通过阈值数量的份额恢复。它解决的是备份的单点丢失问题，不改变后续 BIP-32 钱包派生的基本模型。

当前实现需要区分两个值：

| 名称                           | 含义                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| Encrypted Master Secret（EMS） | 被 SLIP-39 分片、编码到助记词中的加密主秘密。                         |
| Master Secret                  | 使用 passphrase 对 EMS 解密后的结果，可作为 BIP-32 等密钥派生的输入。 |

```text
Master Secret + passphrase
  -> SLIP-39 Feistel 加密
  -> EMS
  -> Shamir 分片
  -> 多份 SLIP-39 助记词

多份助记词
  -> Shamir 恢复 EMS
  -> 使用同一 passphrase 解密
  -> Master Secret
```

因此：

- 助记词份额恢复的是 EMS，不是已经应用 passphrase 的最终钱包秘密。
- 同一组份额使用不同 passphrase，会得到不同 Master Secret 和不同钱包。
- passphrase 不会被编码进助记词，也不能从助记词验证其是否正确。

## 2. Basic 与 Advanced

SLIP-39 支持两级阈值：

```text
group threshold
└─ 每个 group 内还有 member threshold
```

- Basic：通常只有一个 group，只使用组内 `M-of-N` 阈值。
- Advanced：包含多个 group；先满足 group threshold，再分别满足入选 group 的 member threshold。

例如：

```text
2-of-3 groups
├─ Group A: 2-of-3
├─ Group B: 1-of-1
└─ Group C: 3-of-5
```

恢复时需要满足任意两个 group 的内部阈值。不能把“2-of-3 groups”误解为从全部助记词中任取两份。

## 3. Feistel 与 PBKDF2

四轮 Feistel 加密是当前仓库所实现 SLIP-39 passphrase 处理的一部分，不是 OneKey 私自添加、会破坏标准兼容性的增强算法。

当前实现常量为：

| 参数                         |      当前值 |
| ---------------------------- | ----------: |
| `_ROUND_COUNT`               |         `4` |
| `_BASE_ITERATION_COUNT`      |     `10000` |
| `DEFAULT_ITERATION_EXPONENT` |         `1` |
| `_CUSTOMIZATION_STRING`      | `b"shamir"` |

每一轮的 PBKDF2 次数为：

```text
(10000 << iteration_exponent) / 4
```

因此默认 `iteration_exponent = 1` 时：

- 四轮合计 20000 次。
- 每轮 5000 次。

不能把“每轮 5000 次”写成整个算法只执行 5000 次，也不能把 Feistel 与 PBKDF2 描述为两套互斥方案。

## 4. Identifier、salt 与元数据

当前随仓库实现使用：

- 15 位随机 identifier。
- 5 位 iteration exponent。
- salt 为 `b"shamir" + identifier.to_bytes(...)`。
- RS1024 checksum 同样使用 `b"shamir"` customization string。

当前 `Share` 解析结构包含：

```text
identifier
iteration_exponent
group_index
group_threshold
group_count
member_index
member_threshold
share_value
```

本文所对应的实现没有通过“第三个词固定为 academic”来判定格式或兼容性。助记词中的单个词只是位编码结果；identifier、阈值、索引、迭代指数和 checksum 必须整体解析。

以下判断方式是错误的：

```ts
share.split(' ')[2] === 'academic';
```

它既不能验证 checksum，也不能证明所有份额属于同一组，更不能证明 iteration exponent 或阈值配置一致。

## 5. 恢复校验

恢复前至少要验证：

1. 所有助记词长度和 RS1024 checksum 有效。
2. 所有份额使用相同 identifier 和 iteration exponent。
3. `group_threshold`、`group_count` 在所有份额中一致。
4. 每个 group 内的 member threshold 一致。
5. 提供的 group 数量正好满足 group threshold。
6. 每个入选 group 的 member 数量正好满足该组阈值。
7. 恢复后使用正确 passphrase 解密 EMS。

份额阈值满足只能证明 EMS 可以恢复，不能证明 passphrase 正确。错误 passphrase 仍会产生格式合法但完全不同的钱包。

## 6. 与 SDK 的边界

Hardware JS SDK 负责把 Reset/Recovery 等请求发送给设备，并处理设备端的词语输入、确认和状态消息。应用层不应：

- 自行实现一套与固件不同的 SLIP-39 加解密再假设地址兼容。
- 根据某个固定词判断助记词来源。
- 在日志、遥测或错误上报中记录完整份额、EMS、Master Secret 或 passphrase。
- 把 SLIP-39 份额当作可以独立使用的普通 BIP-39 助记词。

如果应用需要离线验证或迁移 SLIP-39，应使用经过测试向量验证、与目标格式版本一致的实现，并至少覆盖：

- Basic 与 Advanced 阈值恢复。
- 错误 checksum。
- 不同 identifier 混用。
- 不同 iteration exponent 混用。
- 不足或超出阈值的份额集合。
- 空 passphrase、非空 passphrase 和 Unicode 规范化。

## 7. 当前实现索引

- SLIP-39 高层实现：`submodules/firmware/core/src/trezor/crypto/slip39.py`
- C 扩展与词表：`submodules/firmware/crypto/slip39.c`
- 单元测试：`submodules/firmware/core/tests/test_trezor.crypto.slip39.py`
- 测试向量：`submodules/firmware/core/tests/slip39_vectors.py`
- 设备恢复测试：`submodules/firmware/tests/device_tests/test_msg_recoverydevice_slip39_basic.py`
- Advanced 恢复测试：`submodules/firmware/tests/device_tests/test_msg_recoverydevice_slip39_advanced.py`
