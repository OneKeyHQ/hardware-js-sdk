import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Download,
  ExternalLink,
  Server,
  Terminal,
  Play,
  CheckCircle,
  Copy,
  Container,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { PageLayout } from '../components/common/PageLayout';

export default function EmulatorPage() {
  const { toast } = useToast();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (text: string, commandType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandType);
      toast({
        title: '已复制',
        description: '命令已复制到剪贴板',
      });
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      toast({
        title: '复制失败',
        description: '请手动复制命令',
        variant: 'destructive',
      });
    }
  };

  const dockerCommands = {
    classic: 'docker run -it --rm -p 21321:21321 onekey/classic-emulator:latest',
    pro: 'docker run -it --rm -p 21321:21321 onekey/pro-emulator:latest',
  };

  return (
    <PageLayout fixedHeight={false}>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col px-4 py-2 min-h-0">
          {/* 页面标题 */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Server className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">硬件模拟器</h1>
            </div>
            <p className="text-muted-foreground">
              使用OneKey硬件模拟器进行开发和测试，无需物理设备即可体验完整功能
            </p>
          </div>

          {/* 主要内容 */}
          <div className="flex-1 min-h-0 space-y-6">
            {/* Bridge应用程序下载 */}
            <Card className="bg-card border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  OneKey Bridge 应用程序
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  OneKey Bridge是连接硬件设备和Web应用的桥梁程序，支持模拟器连接功能。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() =>
                      window.open('https://github.com/OneKeyHQ/OneKey-Bridge/releases', '_blank')
                    }
                  >
                    <Monitor className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Windows</div>
                      <div className="text-xs text-muted-foreground">exe安装包</div>
                    </div>
                    <ExternalLink className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() =>
                      window.open('https://github.com/OneKeyHQ/OneKey-Bridge/releases', '_blank')
                    }
                  >
                    <Monitor className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">macOS</div>
                      <div className="text-xs text-muted-foreground">dmg安装包</div>
                    </div>
                    <ExternalLink className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() =>
                      window.open('https://github.com/OneKeyHQ/OneKey-Bridge/releases', '_blank')
                    }
                  >
                    <Monitor className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Linux</div>
                      <div className="text-xs text-muted-foreground">deb/rpm包</div>
                    </div>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium mb-1">安装说明</div>
                      <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>下载对应系统的Bridge安装包</li>
                        <li>安装并启动OneKey Bridge应用</li>
                        <li>确保Bridge运行在默认端口21321</li>
                        <li>在本页面启动模拟器后即可连接</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Docker模拟器 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Classic模拟器 */}
              <Card className="bg-card border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    OneKey Classic 模拟器
                    <Badge variant="secondary">Docker</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    模拟OneKey Classic系列硬件钱包，支持完整的设备功能和交互。
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Docker镜像</span>
                      <Badge variant="outline">onekey/classic-emulator</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">端口</span>
                      <Badge variant="outline">21321</Badge>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">启动命令</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(dockerCommands.classic, 'classic')}
                      >
                        {copiedCommand === 'classic' ? (
                          <CheckCircle className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <code className="text-xs font-mono break-all">{dockerCommands.classic}</code>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => copyToClipboard(dockerCommands.classic, 'classic')}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    复制启动命令
                  </Button>
                </CardContent>
              </Card>

              {/* Pro模拟器 */}
              <Card className="bg-card border border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    OneKey Pro 模拟器
                    <Badge variant="secondary">Docker</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    模拟OneKey Pro系列硬件钱包，支持触摸屏交互和高级功能。
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Docker镜像</span>
                      <Badge variant="outline">onekey/pro-emulator</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">端口</span>
                      <Badge variant="outline">21321</Badge>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">启动命令</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(dockerCommands.pro, 'pro')}
                      >
                        {copiedCommand === 'pro' ? (
                          <CheckCircle className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <code className="text-xs font-mono break-all">{dockerCommands.pro}</code>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => copyToClipboard(dockerCommands.pro, 'pro')}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    复制启动命令
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 使用教程 */}
            <Card className="bg-card border border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  快速开始教程
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Container className="h-4 w-4 text-primary" />
                      1. 启动模拟器
                    </h3>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>确保已安装Docker</li>
                      <li>选择Classic或Pro模拟器</li>
                      <li>复制并执行启动命令</li>
                      <li>等待模拟器启动完成</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary" />
                      2. 连接模拟器
                    </h3>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>返回首页选择&ldquo;模拟器&rdquo;连接方式</li>
                      <li>点击连接按钮</li>
                      <li>模拟器将自动被检测到</li>
                      <li>开始使用各种硬件功能</li>
                    </ol>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium text-primary mb-1">提示</div>
                      <p className="text-muted-foreground">
                        模拟器默认运行在端口21321，确保该端口未被其他程序占用。
                        如果遇到连接问题，请检查防火墙设置或尝试重启模拟器。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open('https://docs.onekey.so/hardware/emulator', '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    详细文档
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open('https://github.com/OneKeyHQ/hardware-emulator', '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    GitHub仓库
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
