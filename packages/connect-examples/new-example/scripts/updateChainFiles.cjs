const fs = require("fs");
const path = require("path");

// 从元数据文件导入（需要先构建TypeScript）
const CHAIN_METADATA = {
  bitcoin: {
    id: "bitcoin",
    name: "Bitcoin",
    description: "Bitcoin blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" fill="#F7931A"/><path d="M17.058 11.174c.195-1.31-.802-2.013-2.165-2.483l.442-1.774-1.08-.269-.43 1.727c-.284-.071-.575-.138-.865-.203l.433-1.736-1.08-.269-.442 1.774c-.235-.054-.465-.107-.688-.162l-.001-.004-1.489-.372-.287 1.15s.802.184.785.195c.437.109.516.398.503.628l-.504 2.02c.03.008.069.019.112.036-.036-.009-.074-.018-.113-.027l-.707 2.836c-.054.133-.19.333-.497.257.011.016-.785-.196-.785-.196l-.536 1.233 1.405.35c.261.066.517.135.769.201l-.447 1.795 1.08.269.442-1.774c.293.079.578.152.857.223l-.441 1.767 1.08.269.447-1.794c1.843.349 3.23.208 3.815-1.458.471-1.342-.023-2.117-.993-2.62.706-.163 1.238-.628 1.38-1.587zm-2.468 3.461c-.334 1.34-2.593.616-3.326.434l.594-2.378c.733.183 3.081.545 2.732 1.944zm.334-3.481c-.305 1.217-2.189.599-2.797.447l.538-2.159c.608.152 2.581.436 2.259 1.712z" fill="#FFF"/></svg>`,
    color: "#F7931A",
    category: "bitcoin",
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    description: "Ethereum and EVM-compatible chains",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.999 0L7.06 12.188l4.939 2.274 4.94-2.274L11.999 0z" fill="#627EEA"/><path d="M11.999 24l4.94-6.838-4.94-2.274-4.939 2.274L11.999 24z" fill="#627EEA"/><path d="M11.999 17.538l4.94-2.274-4.94-2.273-4.939 2.273 4.939 2.274z" fill="#627EEA" fill-opacity="0.6"/><path d="M7.06 12.188L11.999 0v15.265l-4.939-3.077z" fill="#627EEA" fill-opacity="0.45"/><path d="M11.999 0l4.94 12.188-4.94 3.077V0z" fill="#627EEA" fill-opacity="0.8"/></svg>`,
    color: "#627EEA",
    category: "ethereum",
  },
  solana: {
    id: "solana",
    name: "Solana",
    description: "Solana blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.22 9.4a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67l-2.72 2.72a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67L4.22 9.4z" fill="url(#a)"/><path d="M4.22 2.13a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67L18.6 5.29a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67L4.22 2.13z" fill="url(#b)"/><path d="M18.6 16.87a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67l2.72-2.72a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67l-2.72 2.72z" fill="url(#c)"/><defs><linearGradient id="a" x1="21.84" y1="12.82" x2="6.34" y2="-2.68" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient><linearGradient id="b" x1="21.84" y1="5.55" x2="6.34" y2="-9.95" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient><linearGradient id="c" x1="21.84" y1="20.09" x2="6.34" y2="4.59" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient></defs></svg>`,
    color: "#9945FF",
    category: "solana",
  },
  cardano: {
    id: "cardano",
    name: "Cardano",
    description: "Cardano blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.153 7.845a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm-1.335 8.31a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zM12 18.667a1.067 1.067 0 1 1 0-2.134 1.067 1.067 0 0 1 0 2.134zm0-2.4A5.333 5.333 0 1 1 17.333 10.933 5.339 5.339 0 0 1 12 16.267zm0-8.534a3.2 3.2 0 1 0 3.2 3.2A3.204 3.204 0 0 0 12 7.733zm0-2.4a1.067 1.067 0 1 1 0-2.133 1.067 1.067 0 0 1 0 2.133zM5.847 7.845a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm1.335 8.31a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z" fill="#0033AD"/></svg>`,
    color: "#0033AD",
    category: "cardano",
  },
  polkadot: {
    id: "polkadot",
    name: "Polkadot",
    description: "Polkadot ecosystem operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.4 7.7a2.4 2.4 0 1 1-2.4-2.4 2.4 2.4 0 0 1 2.4 2.4zm-2.4 8.6a2.4 2.4 0 1 1 2.4-2.4 2.4 2.4 0 0 1-2.4 2.4zM12 18.4a2.4 2.4 0 1 1 2.4-2.4A2.4 2.4 0 0 1 12 18.4zm0-12.8a2.4 2.4 0 1 1 2.4-2.4A2.4 2.4 0 0 1 12 5.6zM5.6 16.3a2.4 2.4 0 1 1 2.4-2.4 2.4 2.4 0 0 1-2.4 2.4zm2.4-8.6a2.4 2.4 0 1 1-2.4-2.4 2.4 2.4 0 0 1 2.4 2.4z" fill="#E6007A"/></svg>`,
    color: "#E6007A",
    category: "polkadot",
  },
  device: {
    id: "device",
    name: "Device",
    description: "Device management operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#10B981"/></svg>`,
    color: "#10B981",
    category: "device",
  },
  basic: {
    id: "basic",
    name: "Basic",
    description: "Basic operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    color: "#6B7280",
    category: "basic",
  },
  // 简化版本，只包含主要的几个链，其他都归类到相应分类
  conflux: {
    id: "conflux",
    name: "Conflux",
    description: "Conflux Network operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#0B1D36"/><path d="M8 8l8 8M16 8l-8 8" stroke="#00D4FF" stroke-width="2"/></svg>`,
    color: "#00D4FF",
    category: "ethereum",
  },
  cosmos: {
    id: "cosmos",
    name: "Cosmos",
    description: "Cosmos ecosystem operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#2E2E54"/><circle cx="12" cy="12" r="6" fill="none" stroke="#6F7390" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="#6F7390"/></svg>`,
    color: "#6F7390",
    category: "cosmos",
  },
  near: {
    id: "near",
    name: "NEAR",
    description: "NEAR Protocol operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00C08B" stroke-width="2" fill="none"/></svg>`,
    color: "#00C08B",
    category: "near",
  },
  aptos: {
    id: "aptos",
    name: "Aptos",
    description: "Aptos blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#00C2FF"/><path d="M8 12l4 4 4-4-4-4-4 4z" fill="white"/></svg>`,
    color: "#00C2FF",
    category: "aptos",
  },
  sui: {
    id: "sui",
    name: "Sui",
    description: "Sui blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#6FBCF0"/><path d="M8 10l4-2 4 2v4l-4 2-4-2v-4z" fill="white"/></svg>`,
    color: "#6FBCF0",
    category: "sui",
  },
  ton: {
    id: "ton",
    name: "TON",
    description: "The Open Network operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#0088CC"/><rect x="8" y="8" width="8" height="8" rx="2" fill="white"/></svg>`,
    color: "#0088CC",
    category: "ton",
  },
  tron: {
    id: "tron",
    name: "Tron",
    description: "Tron blockchain operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z" fill="#FF060A"/></svg>`,
    color: "#FF060A",
    category: "tron",
  },
  ripple: {
    id: "ripple",
    name: "XRP",
    description: "XRP Ledger operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#23292F"/><path d="M8 8h8l-4 8-4-8z" fill="#00D4FF"/></svg>`,
    color: "#00D4FF",
    category: "ripple",
  },
  stellar: {
    id: "stellar",
    name: "Stellar",
    description: "Stellar network operations",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#7D00FF"/><polygon points="12,4 16,12 12,20 8,12" fill="white"/></svg>`,
    color: "#7D00FF",
    category: "stellar",
  },
  // 其他链都归类到相应的主要分类
  lightning: {
    ...{
      id: "lightning",
      name: "Lightning",
      description: "Bitcoin Lightning Network operations",
      icon: "",
      color: "#F7931A",
    },
    category: "bitcoin",
  },
  kaspa: {
    id: "kaspa",
    name: "Kaspa",
    description: "Kaspa blockchain operations",
    icon: "",
    color: "#70C7C7",
    category: "kaspa",
  },
  algo: {
    id: "algo",
    name: "Algorand",
    description: "Algorand blockchain operations",
    icon: "",
    color: "#000000",
    category: "algorand",
  },
  filecoin: {
    id: "filecoin",
    name: "Filecoin",
    description: "Filecoin network operations",
    icon: "",
    color: "#0090FF",
    category: "filecoin",
  },
  neo: {
    id: "neo",
    name: "NEO",
    description: "NEO blockchain operations",
    icon: "",
    color: "#00E599",
    category: "neo",
  },
  nem: {
    id: "nem",
    name: "NEM",
    description: "NEM blockchain operations",
    icon: "",
    color: "#67B2E8",
    category: "nem",
  },
  nervos: {
    id: "nervos",
    name: "Nervos",
    description: "Nervos Network operations",
    icon: "",
    color: "#3CC68A",
    category: "nervos",
  },
  starcoin: {
    id: "starcoin",
    name: "Starcoin",
    description: "Starcoin blockchain operations",
    icon: "",
    color: "#4285F4",
    category: "starcoin",
  },
  scdo: {
    id: "scdo",
    name: "SCDO",
    description: "SCDO blockchain operations",
    icon: "",
    color: "#FF6B6B",
    category: "scdo",
  },
  dynex: {
    id: "dynex",
    name: "Dynex",
    description: "Dynex blockchain operations",
    icon: "",
    color: "#00CED1",
    category: "dynex",
  },
  nexa: {
    id: "nexa",
    name: "Nexa",
    description: "Nexa blockchain operations",
    icon: "",
    color: "#00D2FF",
    category: "nexa",
  },
  nostr: {
    id: "nostr",
    name: "Nostr",
    description: "Nostr protocol operations",
    icon: "",
    color: "#8B5CF6",
    category: "nostr",
  },
  alephium: {
    id: "alephium",
    name: "Alephium",
    description: "Alephium blockchain operations",
    icon: "",
    color: "#FF6B35",
    category: "alephium",
  },
  allnetwork: {
    id: "allnetwork",
    name: "All Networks",
    description: "Multi-chain operations",
    icon: "",
    color: "#6366F1",
    category: "ethereum",
  },
  benfen: {
    id: "benfen",
    name: "Benfen",
    description: "Benfen blockchain operations",
    icon: "",
    color: "#FF9500",
    category: "benfen",
  },
};

const chainsDir = path.join(__dirname, "..", "app", "data", "chains");

function updateChainFile(filePath, chainId) {
  console.log(`Updating ${chainId}.ts...`);

  const metadata = CHAIN_METADATA[chainId];
  if (!metadata) {
    console.log(`No metadata found for ${chainId}, skipping...`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, "utf8");

    // 检查是否已经有元数据
    if (content.includes("export const chainMeta")) {
      console.log(`${chainId}.ts already has metadata, skipping...`);
      return;
    }

    // 添加类型导入
    const typeImport = `import type { ChainCategory } from "../types/index";\n`;
    if (!content.includes("import type { ChainCategory }")) {
      content = content.replace(
        /import.*from.*Playground.*\n/,
        `$&${typeImport}`
      );
    }

    // 添加链元数据
    const metadataCode = `
// 链元数据
export const chainMeta = {
  id: "${metadata.id}",
  name: "${metadata.name}",
  description: "${metadata.description}",
  icon: \`${metadata.icon}\`,
  color: "${metadata.color}",
  category: "${metadata.category}" as ChainCategory,
};

`;

    // 在第一个 const api 声明之前插入元数据
    content = content.replace(/^(const api.*)/m, `${metadataCode}$1`);

    // 在文件末尾添加导出
    if (!content.includes("export const chainConfig")) {
      const exportCode = `
// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};
`;
      content = content.replace(
        /^export default api;$/m,
        `${exportCode}\nexport default api;`
      );
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Successfully updated ${chainId}.ts`);
  } catch (error) {
    console.error(`❌ Error updating ${chainId}.ts:`, error.message);
  }
}

function main() {
  if (!fs.existsSync(chainsDir)) {
    console.error("Chains directory not found:", chainsDir);
    return;
  }

  const files = fs.readdirSync(chainsDir);
  const chainFiles = files.filter(
    (file) => file.endsWith(".ts") && !file.startsWith("_")
  );

  console.log(`Found ${chainFiles.length} chain files to update:`);
  chainFiles.forEach((file) => console.log(`  - ${file}`));
  console.log("");

  chainFiles.forEach((file) => {
    const chainId = path.basename(file, ".ts");
    const filePath = path.join(chainsDir, file);
    updateChainFile(filePath, chainId);
  });

  console.log("\n✅ Chain files update completed!");
}

if (require.main === module) {
  main();
}

module.exports = { updateChainFile, CHAIN_METADATA };
