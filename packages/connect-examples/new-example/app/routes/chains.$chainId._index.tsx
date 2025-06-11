import React, { useState } from "react";
import { useParams, useNavigate } from "@remix-run/react";
import { Search, Layers } from "lucide-react";
import { Input } from "../components/ui/Input";
import { PageLayout } from "../components/common/PageLayout";
import { DeviceNotConnectedState } from "../components/common/DeviceNotConnectedState";
import { ChainBoundary } from "../components/common/ChainBoundary";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { useMethodResolver } from "../hooks/useMethodResolver";
import { ChainIcon } from "../components/icons/ChainIcon";

const ChainMethodsIndexPage: React.FC = () => {
  const { chainId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { selectedChain, isChainNotFound } = useMethodResolver({ chainId });

  // 处理方法选择
  const handleMethodSelect = (methodName: string) => {
    navigate(`/chains/${chainId}/${methodName}`);
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  return (
    <ChainBoundary chainId={chainId} checkNotFound={isChainNotFound}>
      {selectedChain && (
        <PageLayout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto px-6 py-4 space-y-4">
              {/* 面包屑导航 + 搜索框 */}
              <div className="flex items-center justify-between gap-4">
                <Breadcrumb
                  items={[
                    {
                      label: "Blockchain Methods",
                      href: "/chains",
                      icon: Layers,
                    },
                    {
                      label: selectedChain.name,
                      icon: () => (
                        <ChainIcon chainId={selectedChain.id} size={16} />
                      ),
                    },
                  ]}
                />
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search methods..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 链信息头部 */}
              <div className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 border border-border/30 rounded-2xl p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05]" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
                    <ChainIcon chainId={selectedChain.id} size={28} />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">
                      {selectedChain.name}
                    </h1>
                    <p className="text-muted-foreground font-medium">
                      {
                        selectedChain.methods.filter(
                          (method) =>
                            method.method
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            method.description
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())
                        ).length
                      }{" "}
                      methods available
                    </p>
                  </div>
                </div>
              </div>

              {/* 设备连接状态 */}
              <DeviceNotConnectedState />

              {/* 方法列表 */}
              <div className="grid gap-4">
                {selectedChain.methods
                  .filter(
                    (method) =>
                      method.method
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      method.description
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  )
                  .map((method, methodIndex) => (
                    <div
                      key={`${selectedChain.id}-${method.method}-${methodIndex}`}
                      className="group relative overflow-hidden bg-card border border-border/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 hover:-translate-y-1"
                      onClick={() => handleMethodSelect(method.method)}
                      onKeyDown={(e) =>
                        handleKeyDown(e, () =>
                          handleMethodSelect(method.method)
                        )
                      }
                      tabIndex={0}
                      role="button"
                      aria-label={`Execute ${method.method}`}
                    >
                      {/* 微妙的悬停效果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-foreground/0 via-foreground/0 to-foreground/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-base font-semibold font-mono text-foreground group-hover:text-foreground/80 transition-colors duration-200">
                                {method.method}
                              </h3>
                              {method.deprecated && (
                                <span className="text-xs bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                                  Deprecated
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed pr-8">
                              {method.description}
                            </p>
                          </div>

                          {/* 简约箭头 */}
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center group-hover:bg-muted/50 group-hover:scale-105 transition-all duration-200">
                              <svg
                                className="w-4 h-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors duration-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* 空状态 */}
              {selectedChain.methods.filter(
                (method) =>
                  method.method
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  method.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
              ).length === 0 &&
                searchTerm && (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-20 h-20 bg-muted/20 rounded-2xl flex items-center justify-center mb-6">
                      <Search className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3 tracking-tight">
                      No methods found
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                      No methods match your search for{" "}
                      <span className="font-semibold text-foreground/80">
                        &quot;{searchTerm}&quot;
                      </span>
                      . Try adjusting your search terms or browse all available
                      methods.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </PageLayout>
      )}
    </ChainBoundary>
  );
};

export default ChainMethodsIndexPage;
