# OneKey Developer Portal Landing Page 改动方案

## 1. 推荐设计方案

**建议采用方案 A（Editorial Tech：专业、可信、硬件感）**。

理由：
- 主转化目标是“引导文档、快速接入”，需要强调可信、工程化与安全感；A 方案在叙事结构、版式与视觉层次上最契合。
- 与 OneKey 现有官网/产品调性一致：偏专业、严肃、可信，而非极客炫酷或极简奢侈。
- 可以自然承接品牌绿（OneKey 视觉识别）与硬件资产图。

## 2. 可用的品牌与数据资产（已从仓库提取）

### 2.1 字体与排版风格
- 官网门户字体：`Stabil Grotesk`（主字体）
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/web/src/style/stabilGroteskFont.ts`
- 官网博客等使用等宽字体：`Geist Mono`
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/blog/src/fonts/geist.ts`
- App 侧默认 web 字体为系统栈（偏应用内 UI 使用）：
  - 路径：`/Users/caikaisheng/Documents/GitHub/app-monorepo/packages/components/src/utils/webFontFamily.ts`

**结论**：Landing Page 建议优先对齐官网：`Stabil Grotesk` + `Geist Mono`（代码片段/数据部分）。

### 2.2 品牌色与配色
- Portal 主题色（品牌绿）：`#00B812`（brand500）
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/shared/src/ui/theme/index.ts`
- App 语义色板（品牌绿梯度）：
  - 路径：`/Users/caikaisheng/Documents/GitHub/app-monorepo/packages/components/colors/primitive/brand.ts`
  - 主要可用值：`#51BD5E`（brand8）、`#86EA90`（brand9）

**结论**：Landing Page CTA 与强调色建议统一为品牌绿；背景使用中性灰/近黑，弱化蓝色渐变。

### 2.3 社会证明/指标数据
可用于 Landing Page 社会证明模块（需文案确认）：
- **100+ 条链、30,000+ 币种**
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/shared/locales/zh_CN/onekey-pro-new.json`
  - 相关字段：`title__1_wallet_100_plus_chains_30000_plus_coins`，`content__access_100_plus_blockchains_from_one_dashboard`，`content__supports_bitcoin_ethereum_usdt_solana_xrp_and_30000_plus_other_coins`
- **支持 80+ 区块链（硬件 SDK 能力）**
  - 路径：`/Users/caikaisheng/Documents/GitHub/hardware-js-sdk/docs/chain.md`
  - 相关字段：`OneKey硬件钱包通过统一的密码学原语支持80+区块链`
- **每年拦截超过 100 万起诈骗**（安全可信背书，可用于信任模块）
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/shared/locales/zh_CN/onekey-pro-new.json`
  - 相关字段：`content__blocks_over_1m_scams_every_year`
- **1000+ 加密货币**（偏通用支持范围）
  - 路径：`/Users/caikaisheng/Documents/GitHub/portal/packages/shared/locales/zh_CN/common.json`
  - 相关字段：`menu__supported_chains_desc`

> 目前未在仓库中直接定位到“出货量 / 下载量 / 集成数量”的具体数字，建议由业务侧确认后补充。

### 2.4 硬件设备图片
可直接用于 Landing Page 媒体展示区：
- 设备原图：
  - 目录：`/Users/caikaisheng/Documents/GitHub/hardware-js-sdk/packages/connect-examples/expo-playground/app/assets/device`
  - 典型文件：`pro-black.png`, `pro-white.png`, `classic1s.png`, `touch.png`, `mini.png`
- 设备 Mockup：
  - 目录：`/Users/caikaisheng/Documents/GitHub/hardware-js-sdk/packages/connect-examples/expo-playground/app/assets/deviceMockup`
  - 典型文件：`pro-black.png`, `pro-white.png`, `classic1s.png`, `touch.png`, `pure.png`

## 3. Landing Page 结构改动建议（对齐 11 要素）

### 3.1 信息架构（建议版）
1) Header（Logo + Docs/SDK/Support + CTA）
2) Hero（价值主张 + 主 CTA + 代码片段）
3) Social Proof（数字背书）
4) Media（硬件设备图 + SDK 流程示意）
5) Benefits（3-5 条接入优势）
6) Integration Paths（现有 SDK 卡片升级）
7) Testimonials / Trust（来自安全审计/合作伙伴文案）
8) FAQ（接入常见问题）
9) Final CTA（“立即开始接入”）
10) Footer（保留现有结构）

### 3.2 关键版块建议
- **Hero**
  - 主标题：强调“硬件安全 + 开发接入快”
  - 副标题：突出 SDK/文档路径
  - CTA：`快速开始`（主）/`查看示例`（次）/`API Reference`
  - 右侧：代码片段（现有 `codeSnippet` 可用）+ 设备图

- **Social Proof**
  - 建议 3 个数字卡：`100+ 条链` / `30,000+ 币种` / `80+ 区块链(硬件 SDK)`
  - 如确认“出货量/下载量”，可替换或补充

- **Media**
  - 设备 Mockup + “Air-Gap/硬件签名流程”可视化（轻量流程图）

- **Benefits**
  - 强调开发者视角的价值：
    1) 硬件级安全与离线签名
    2) 多端接入（WebUSB/BLE/Native）
    3) SDK 稳定性与示例齐全
    4) 多链支持

- **FAQ**
  - 是否必须使用硬件？
  - Web/移动端接入差异？
  - 生产环境审核/安全要求？

- **Final CTA**
  - “立即开始接入”+ “请求架构支持”

### 3.3 组件拆分建议（LandingPage 结构）
- `components/landing/HeaderNav.jsx`
- `components/landing/Hero.jsx`
- `components/landing/SocialProof.jsx`
- `components/landing/MediaShowcase.jsx`
- `components/landing/Benefits.jsx`
- `components/landing/IntegrationPaths.jsx`
- `components/landing/TrustStrip.jsx`（可选：审计/合作伙伴）
- `components/landing/FAQ.jsx`
- `components/landing/FinalCTA.jsx`
- `components/landing/Footer.jsx`

### 3.4 版块文案草案（中英可按需切换）
- **Hero**
  - H1：`硬件级安全的 Web3 接入，从文档开始`
  - Sub：`官方 SDK + 清晰指引，5 分钟跑通 WebUSB/BLE/Native`
  - CTA：`快速开始` / `查看示例` / `API Reference`
- **Social Proof**
  - `100+ 条链` / `30,000+ 币种` / `80+ 硬件支持链`
- **Media**
  - 标题：`设备在场，签名可验证`
  - 说明：`支持 Air-Gap 离线签名与硬件确认，关键交易可见可控`
- **Benefits**
  - `硬件级安全` / `多端接入` / `多链支持` / `示例齐全` / `生产可用`
- **Integration Paths**
  - 标题：`选择你的接入路径`
  - 推荐标记：`WebUSB（推荐）`、`React Native BLE（移动端）`
- **FAQ**
  - `必须使用硬件吗？` / `Web 与移动端接入差异？` / `上线前需要注意什么？`
- **Final CTA**
  - 标题：`现在就开始接入 OneKey`
  - 说明：`从快速开始到生产落地，我们提供可验证的文档与示例`
  - CTA：`快速开始` / `请求架构支持`

### 3.5 具体组件结构（建议 Props 与内容）
- **`HeaderNav.jsx`**
  - Props：`locale`, `ctaHref`
  - 结构：Logo（沿用 OneKeyLogo）+ 导航（Docs/SDK/Support）+ CTA 按钮
  - 说明：支持 `locale` 下的文案切换，CTA 指向 `/${locale}/hardware-sdk/getting-started`

- **`Hero.jsx`**
  - Props：`locale`, `codeSnippet`, `deviceImageSrc`
  - 结构：左侧标题/副标题/CTA；右侧设备 Mockup + 代码片段卡片
  - 说明：保持 `codeSnippet` 现有内容，新增设备图（来自 deviceMockup）

- **`SocialProof.jsx`**
  - Props：`items`（`[{ value, label, note? }]`）
  - 结构：三列数字卡
  - 说明：默认 3 个指标：100+ 条链 / 30,000+ 币种 / 80+ 区块链

- **`MediaShowcase.jsx`**
  - Props：`title`, `description`, `imageSrc`
  - 结构：左侧描述 + 右侧大图（设备或 Air-Gap 流程图）
  - 说明：可扩展为双图（设备 + 流程）布局

- **`Benefits.jsx`**
  - Props：`items`（`[{ title, desc, icon }]`）
  - 结构：2x2 或 3x2 卡片网格
  - 说明：图标可复用 lucide-react（Shield/Usb/Bluetooth/Wrench/Globe）

- **`IntegrationPaths.jsx`**
  - Props：`data`（复用现有 `sdkSection`）
  - 结构：三组路径卡 + 推荐标签
  - 说明：原 `IntegrationCard` 升级；`WebUSB`/`React Native BLE` 增加“推荐/移动端”标签

- **`TrustStrip.jsx`（可选）**
  - Props：`items`（合作伙伴或审计背书）
  - 结构：横向 logo/背书文本
  - 说明：若无素材，可先放占位并隐藏

- **`FAQ.jsx`**
  - Props：`items`（`[{ q, a }]`）
  - 结构：Accordion 列表
  - 说明：默认 3-5 条，聚焦接入路径与生产注意事项

- **`FinalCTA.jsx`**
  - Props：`primaryHref`, `secondaryHref`, `locale`
  - 结构：大标题 + CTA 双按钮
  - 说明：主按钮指向快速开始，次按钮指向支持

- **`Footer.jsx`**
  - Props：`locale`
  - 结构：复用现有 Footer

## 7. 拆分落地清单（实施步骤）
1) **抽出静态组件**：把 `LandingPage.jsx` 中 Hero、SDK Section、Support Section、Footer 分段拆到 `components/landing/*`
2) **新增结构模块**：新增 `SocialProof`、`MediaShowcase`、`Benefits`、`FAQ`、`FinalCTA`
3) **整合数据层**：保留 `content` 字段，在 `LandingPage` 统一分发给子组件
4) **替换 CTA 路径**：主 CTA → `/${locale}/hardware-sdk/getting-started`；次 CTA → 示例/Playground
5) **接入图片**：引入 `deviceMockup` 设备图作为 Hero/Media
6) **完善样式**：按 4.4 Tailwind 建议覆盖 Hero 与卡片视觉
7) **确认社会证明数据**：如需替换为出货量/下载量，替换 `SocialProof` 数据即可

## 4. 视觉设计规范（建议版）

### 4.1 字体
- Display/标题：`Stabil Grotesk`
- 代码与数据：`Geist Mono`

### 4.2 色板
- 主色：品牌绿 `#00B812`（Portal 主题色）
- 背景：近黑 `#101111` / 中灰 `#2D3133`（Portal 主题灰）
- 中性白：`#FFFFFF` / `rgba(255,255,255,0.85)`

### 4.3 视觉语言
- 背景：浅噪点 + 细线网格（硬件工程感）
- 卡片：浅浮层 + 微阴影（非玻璃态）
- CTA：圆角椭圆按钮 + 绿色发光阴影

### 4.4 Tailwind 风格建议（关键片段）
- **Hero H1**：`text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight`
- **主 CTA**：`bg-[#00B812] text-white rounded-full px-10 py-3.5 shadow-[0_20px_50px_-30px_rgba(0,184,18,0.45)]`
- **次 CTA**：`border border-zinc-300 text-zinc-700 rounded-full px-10 py-3.5 hover:border-zinc-400`
- **数字卡**：`rounded-2xl border border-zinc-200/70 bg-white/70 px-6 py-5`
- **媒体图容器**：`rounded-3xl border bg-white/80 shadow-[0_40px_120px_-80px_rgba(0,0,0,0.25)]`
- **推荐标签**：`text-xs font-medium bg-[#00B812]/10 text-[#00B812] rounded-full px-2 py-0.5`

## 5. 需要补充/确认的业务数据
- 出货量（全球/年度）
- 下载量/安装量（App 或 SDK）
- 真实集成数量或合作伙伴 Logo

## 6. 建议落地顺序
1) 替换字体与色板（统一 Stabil Grotesk + 品牌绿）
2) 增加 Social Proof 与 Media 版块
3) 升级 Integration Paths（增加“推荐路径”标签）
4) 新增 FAQ 与 Final CTA
