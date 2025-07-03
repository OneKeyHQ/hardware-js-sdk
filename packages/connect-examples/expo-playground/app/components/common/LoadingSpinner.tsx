import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
  className?: string;
  variant?: 'default' | 'centered' | 'inline';
}

export function LoadingSpinner({
  message = 'Loading...',
  subtitle,
  className = '',
  variant = 'default',
}: LoadingSpinnerProps) {
  const renderIcon = () => (
    <div className="relative">
      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
    </div>
  );

  const renderProgressDots = () => (
    <div className="flex gap-1">
      <div
        className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse"
        style={{ animationDelay: '0ms' }}
      />
      <div
        className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse"
        style={{ animationDelay: '200ms' }}
      />
      <div
        className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse"
        style={{ animationDelay: '400ms' }}
      />
    </div>
  );

  // 内联变体 - 简单的spinner
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  // 居中变体 - 极简卡片式loading
  if (variant === 'centered') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] px-4 ${className}`}>
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            {/* 图标 */}
            {renderIcon()}

            {/* 文字信息 */}
            <div className="text-center space-y-1">
              <h3 className="text-sm font-medium text-foreground">{message}</h3>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            {/* 进度指示点 */}
            {renderProgressDots()}
          </div>
        </div>
      </div>
    );
  }

  // 默认变体 - 简洁的居中loading
  return (
    <div className={`flex items-center justify-center min-h-96 ${className}`}>
      <div className="text-center space-y-3">
        {renderIcon()}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {renderProgressDots()}
      </div>
    </div>
  );
}
