import { Cpu, Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
  className?: string;
  variant?: "default" | "centered" | "inline";
  icon?: "default" | "device" | "cpu";
}

export function LoadingSpinner({
  message = "Loading...",
  subtitle,
  className = "",
  variant = "default",
  icon = "default",
}: LoadingSpinnerProps) {
  const renderIcon = () => {
    switch (icon) {
      case "device":
      case "cpu":
        return (
          <div className="relative">
            <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center">
              <Cpu className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
            {/* 旋转边框 */}
            <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-muted-foreground/30 rounded-xl animate-spin" />
          </div>
        );
      default:
        return (
          <div className="relative">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        );
    }
  };

  const renderProgressDots = () => (
    <div className="flex gap-1.5">
      <div
        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <div
        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );

  // 内联变体 - 简单的spinner
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  // 居中变体 - 优雅的卡片式loading
  if (variant === "centered") {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[60vh] px-4 ${className}`}
      >
        <div className="relative">
          {/* 背景装饰圆圈 */}
          <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-muted/20 to-muted/10 rounded-full blur-xl animate-pulse" />

          {/* 主loading容器 */}
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
            <div className="flex flex-col items-center gap-6">
              {/* 图标 */}
              {renderIcon()}

              {/* 文字信息 */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground tracking-tight">
                  {message}
                </h3>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>

              {/* 进度指示点 */}
              {renderProgressDots()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 默认变体 - 简洁的居中loading
  return (
    <div className={`flex items-center justify-center min-h-96 ${className}`}>
      <div className="text-center space-y-4">
        {renderIcon()}
        <div className="space-y-2">
          <p className="text-foreground font-medium">{message}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {renderProgressDots()}
      </div>
    </div>
  );
}
