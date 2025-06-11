import React, { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { Search, ChevronRight, Layers } from "lucide-react";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/common/PageLayout";
import { DeviceNotConnectedState } from "../components/common/DeviceNotConnectedState";
import { ListBoundary } from "../components/common/ListBoundary";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { useTemplateRegistry } from "../hooks/useTemplateRegistry";
import { ChainIcon } from "../components/icons/ChainIcon";
import type { ChainConfig } from "../data/types";

const ChainsIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { chains, getChainMethods } = useTemplateRegistry();

  // 过滤链（排除基础方法链，按原始数组顺序）
  const filteredChains = chains
    .filter(
      (chain) => chain.category !== "device" && chain.category !== "basic"
    )
    .filter((chain) =>
      chain.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // 处理链选择
  const handleChainSelect = (chain: ChainConfig) => {
    navigate(`/chains/${chain.id}`);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  return (
    <ListBoundary title="Blockchain Methods" icon={Layers}>
      <PageLayout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto px-6 py-4 space-y-4">
            {/* 面包屑导航 + 搜索框 */}
            <div className="flex items-center justify-between gap-4">
              <Breadcrumb
                items={[{ label: "Blockchain Methods", icon: Layers }]}
              />
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search blockchains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 页面信息 */}
            <div>
              <p className="text-sm text-muted-foreground">
                {filteredChains.length} blockchains available
              </p>
            </div>

            {/* 设备连接状态 */}
            <DeviceNotConnectedState />

            {/* 链列表 */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredChains.map((chain) => (
                <div
                  key={chain.id}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                  onClick={() => handleChainSelect(chain)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => handleChainSelect(chain))
                  }
                  tabIndex={0}
                  role="button"
                  aria-label={`Explore ${chain.name} methods`}
                >
                  <ChainIcon chainId={chain.id} size={32} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {chain.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getChainMethods(chain.id).length} methods
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>

            {/* 空状态 */}
            {filteredChains.length === 0 && searchTerm && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No blockchains found for &quot;{searchTerm}&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </ListBoundary>
  );
};

export default ChainsIndexPage;
