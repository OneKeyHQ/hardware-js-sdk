# OneKey Hardware SDK - Claude 文档指引

## 📚 Context7 文档支持

本项目已在 Context7 上索引，可通过 MCP 工具获取最新文档和代码示例：

```json
{
  "url": "https://context7.com/onekeyhq/hardware-js-sdk",
  "library_id": "/onekeyhq/hardware-js-sdk"
}
```

**使用方法**：
- 使用 `mcp__context7__get-library-docs` 工具获取文档
- Library ID: `/onekeyhq/hardware-js-sdk`
- 可指定 topic 参数聚焦特定主题，如 `transport`、`signing`、`bip39` 等

## 📁 问题分流指引

根据问题类型，请参考对应的专业文档：

### 🔌 连接与传输问题
**症状**: WebUSB权限错误、设备连接失败、传输超时
- 📖 **参考**: [docs/transport.md](./docs/transport.md)
- 🤖 **Agent**: hardware-sdk-expert

### ⛓️ 区块链集成问题
**症状**: 签名失败、地址生成错误、交易构建问题
- 📖 **参考**: [docs/chain.md](./docs/chain.md)
- 🤖 **Agent**: hardware-sdk-expert

### 🔐 助记词与密钥管理
**症状**: SLIP39恢复失败、密钥派生错误、种子生成问题
- 📖 **参考**: [docs/slip39.md](./docs/slip39.md)
- 🤖 **Agent**: hardware-sdk-expert

### 🏗️ 架构与开发问题
**症状**: 构建失败、依赖问题、monorepo结构疑问
- 📖 **参考**: [docs/architecture.md](./docs/architecture.md)
- 🤖 **Agent**: hardware-sdk-expert

### 🤖 AI Agent 集成 / CLI 使用
**症状**: CLI 命令使用、Agent Skill 配置、链支持查询
- 📖 **入口**: [packages/hd-cli/CLAUDE.md](./packages/hd-cli/CLAUDE.md) — Skills、Schema
- 📖 **文档**: developer-portal 的 `agent-integration.mdx`
- 🔧 **CLI**: `@onekeyfe/hardware-cli` — 29 个命令，覆盖 27 链
- 🔌 **Plugin**: `.claude-plugin/marketplace.json` — Claude Code 插件入口

如果你要**使用硬件钱包**（获取地址、签名、管理设备），请先阅读 [packages/hd-cli/CLAUDE.md](./packages/hd-cli/CLAUDE.md)。

## 🤖 专业Agent

**hardware-sdk-expert** - 硬件SDK架构专家
- 擅长：三层架构分析、WebUSB/BLE协议、BIP32/BIP39/SLIP39
- 工作方式：优先查阅相关文档，然后进行代码分析