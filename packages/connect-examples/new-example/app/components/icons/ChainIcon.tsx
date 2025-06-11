import React from "react";

// 直接导入所有常用的图标资源
import bitcoinIcon from "../../assets/chain/tbtc.png";
import ethereumIcon from "../../assets/chain/teth.png";
import solanaIcon from "../../assets/chain/sol.png";
import tronIcon from "../../assets/chain/tron.png";
import nearIcon from "../../assets/chain/near.png";
import suiIcon from "../../assets/chain/sui.png";
import tonIcon from "../../assets/chain/ton.png";
import aptosIcon from "../../assets/chain/tapt.png";
import filecoinIcon from "../../assets/chain/fil.png";
import kaspaIcon from "../../assets/chain/kas.png";
import nervosIcon from "../../assets/chain/nervos.png";
import polkadotIcon from "../../assets/chain/polkadot.png";
import cardanoIcon from "../../assets/chain/cardano.png";
import algorandIcon from "../../assets/chain/algo.png";
import cosmosIcon from "../../assets/chain/cosmos.png";
import neoIcon from "../../assets/chain/neon3.png";
import nemIcon from "../../assets/chain/nem.png";
import starcoinIcon from "../../assets/chain/stc.png";
import scdoIcon from "../../assets/chain/scdo.png";
import dynexIcon from "../../assets/chain/dynex.png";
import nexaIcon from "../../assets/chain/nexa.png";
import nostrIcon from "../../assets/chain/nostr.png";
import xrpIcon from "../../assets/chain/xrp.png";
import confluxIcon from "../../assets/chain/conflux-espace.png";
import lightningIcon from "../../assets/chain/lnd.png";
import benfenIcon from "../../assets/chain/bfc.png";
import stellarIcon from "../../assets/chain/stellar.png";
import alephiumIcon from "../../assets/chain/alephium.png";
import { ChainCategory } from "~/data/types";

interface ChainIconProps {
  chainId: ChainCategory;
  size?: number | string;
  className?: string;
  fallback?: React.ReactNode;
}

// 链ID到图标资源的直接映射 (预加载)
const CHAIN_ICON_MAP: Record<ChainCategory, string> = {
  // 主要区块链
  xrp: xrpIcon,
  stellar: stellarIcon,
  bitcoin: bitcoinIcon,
  ethereum: ethereumIcon,
  solana: solanaIcon,
  near: nearIcon,
  sui: suiIcon,
  cardano: cardanoIcon,
  polkadot: polkadotIcon,
  cosmos: cosmosIcon,
  aptos: aptosIcon,
  ton: tonIcon,
  tron: tronIcon,
  kaspa: kaspaIcon,
  algorand: algorandIcon,
  filecoin: filecoinIcon,
  neo: neoIcon,
  nem: nemIcon,
  nervos: nervosIcon,
  starcoin: starcoinIcon,
  scdo: scdoIcon,
  dynex: dynexIcon,
  nexa: nexaIcon,
  nostr: nostrIcon,
  conflux: confluxIcon,
  lightning: lightningIcon,
  benfen: benfenIcon,
  alephium: alephiumIcon,
  "all-network": "",
};

// 默认的fallback图标
const DefaultChainIcon: React.FC<{
  size: number | string;
  className: string;
}> = ({ size, className }) => (
  <div
    className={`bg-gray-100 rounded-full flex items-center justify-center ${className}`}
    style={{
      width: typeof size === "number" ? `${size}px` : size,
      height: typeof size === "number" ? `${size}px` : size,
    }}
  >
    <span className="text-gray-400 text-xs font-bold">?</span>
  </div>
);

export const ChainIcon: React.FC<ChainIconProps> = ({
  chainId,
  size = 24,
  className = "",
  fallback,
}) => {
  // 直接从映射表获取图标
  const iconSrc = CHAIN_ICON_MAP[chainId];

  // 如果没找到图标，显示fallback
  if (!iconSrc) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <DefaultChainIcon size={size} className={className} />;
  }

  // 显示图标
  return (
    <img
      src={iconSrc}
      alt={`${chainId} chain icon`}
      className={`object-contain ${className}`}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
      }}
      onError={(e) => {
        // 图片加载失败时隐藏img标签
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        console.warn(
          `ChainIcon: Failed to display icon for chainId "${chainId}"`
        );
      }}
    />
  );
};
