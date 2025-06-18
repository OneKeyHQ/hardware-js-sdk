import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  GitBranch,
  ExternalLink,
  Copy,
  CheckCircle,
  Monitor,
  Smartphone,
  Settings,
  Code,
  Zap,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { PageLayout } from '../components/common/PageLayout';

// 导入设备图片
import proWhiteImg from '../assets/deviceMockup/pro-white.png';
import classic1sImg from '../assets/deviceMockup/classic1s.png';

export default function EmulatorPage() {
  const { toast } = useToast();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

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

  const commands = {
    clone: 'git clone https://github.com/Johnwanzi/onekey-docker.git',
    proVnc: 'bash build_emu.sh pro-emu',
    classicVnc: 'bash build_emu.sh 1s-emu',
    proX11: 'bash build_emu.sh pro-emu --x11',
    classicX11: 'bash build_emu.sh 1s-emu --x11',
  };

  const CommandBlock = ({
    command,
    commandKey,
    title,
    description,
  }: {
    command: string;
    commandKey: string;
    title: string;
    description?: string;
  }) => (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-md p-3 border border-gray-200 dark:border-gray-600/50">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {description.includes('http://localhost:6088') ? (
                <>
                  {description.split('http://localhost:6088')[0]}
                  <a
                    href="http://localhost:6088"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    http://localhost:6088
                  </a>
                  {description.split('http://localhost:6088')[1]}
                </>
              ) : (
                description
              )}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 hover:bg-gray-100 dark:hover:bg-gray-600/50"
          onClick={() => copyToClipboard(command, commandKey)}
        >
          {copiedCommand === commandKey ? (
            <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" />
          )}
        </Button>
      </div>
      <code className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all block bg-white dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-600/30">
        {command}
      </code>
    </div>
  );

  return (
    <PageLayout fixedHeight={false}>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col px-4 py-2 min-h-0">
          {/* 页面标题 */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600/50">
                <Monitor className="h-4 w-4 text-gray-600 dark:text-gray-200" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  硬件模拟器
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  使用 Docker 快速启动 OneKey 硬件模拟器进行开发测试
                </p>
              </div>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="flex-1 min-h-0 space-y-5">
            {/* 快速开始 */}
            <Card className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50 text-lg">
                  <Zap className="h-4 w-4 text-blue-500" />
                  快速开始
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 步骤1: 克隆仓库 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-500/30">
                      1
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      克隆 Docker 仓库
                    </h3>
                  </div>
                  <CommandBlock
                    command={commands.clone}
                    commandKey="clone"
                    title="下载模拟器脚本"
                    description="包含所有平台的一键启动脚本"
                  />
                </div>

                {/* 步骤2: 选择模拟器类型 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-500/30">
                      2
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">启动模拟器</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* OneKey Pro */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          OneKey Pro
                        </span>
                        <div className="relative">
                          <Eye
                            className="h-3.5 w-3.5 text-gray-400 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            onMouseEnter={() => setHoveredDevice('pro')}
                            onMouseLeave={() => setHoveredDevice(null)}
                          />
                          {/* 设备图片悬浮显示 */}
                          {hoveredDevice === 'pro' && (
                            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 w-24 h-32">
                              <img
                                src={proWhiteImg}
                                alt="OneKey Pro"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-700 border-r border-b border-gray-200 dark:border-gray-600 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      <CommandBlock
                        command={commands.proVnc}
                        commandKey="proVnc"
                        title="VNC 模式（推荐）"
                        description="所有平台通用，启动后访问 http://localhost:6088"
                      />

                      <CommandBlock
                        command={commands.proX11}
                        commandKey="proX11"
                        title="X11 模式"
                        description="仅限 Linux，原生窗口显示"
                      />
                    </div>

                    {/* OneKey Classic 1s */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-3.5 w-3.5 text-gray-500 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          OneKey Classic 1s
                        </span>
                        <div className="relative">
                          <Eye
                            className="h-3.5 w-3.5 text-gray-400 dark:text-gray-400 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            onMouseEnter={() => setHoveredDevice('classic')}
                            onMouseLeave={() => setHoveredDevice(null)}
                          />
                          {/* 设备图片悬浮显示 */}
                          {hoveredDevice === 'classic' && (
                            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 w-24 h-32">
                              <img
                                src={classic1sImg}
                                alt="OneKey Classic 1s"
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-700 border-r border-b border-gray-200 dark:border-gray-600 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      <CommandBlock
                        command={commands.classicVnc}
                        commandKey="classicVnc"
                        title="VNC 模式（推荐）"
                        description="所有平台通用，启动后访问 http://localhost:6088"
                      />

                      <CommandBlock
                        command={commands.classicX11}
                        commandKey="classicX11"
                        title="X11 模式"
                        description="仅限 Linux，原生窗口显示"
                      />
                    </div>
                  </div>
                </div>

                {/* 步骤3: 连接模拟器 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-500/30">
                      3
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">连接到应用</h3>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          在首页切换连接方式
                        </div>
                        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5 list-decimal list-inside">
                          <li>返回首页，在连接设置中选择 &ldquo;模拟器&rdquo; 传输方式</li>
                          <li>点击连接按钮，系统会自动检测运行中的模拟器</li>
                          <li>开始使用完整的硬件钱包功能进行开发测试</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 开发资源和说明 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">开发资源</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 text-gray-900 dark:text-gray-100"
                      onClick={() =>
                        window.open('https://github.com/Johnwanzi/onekey-docker', '_blank')
                      }
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      Docker 仓库
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 text-gray-900 dark:text-gray-100"
                      onClick={() => {
                        toast({
                          title: '文档正在完善中',
                          description: '详细文档即将发布，敬请期待',
                        });
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      详细文档
                      <Badge
                        variant="secondary"
                        className="ml-auto text-xs bg-gray-200 dark:bg-gray-600/50 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-500"
                      >
                        即将发布
                      </Badge>
                    </Button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600/50 rounded-md p-3 mt-3">
                    <div className="text-xs text-gray-600 dark:text-gray-200 space-y-1">
                      <div>
                        <strong>VNC 模式</strong>
                        ：跨平台通用，通过浏览器访问模拟器界面，无需额外配置
                      </div>
                      <div>
                        <strong>X11 模式</strong>：Linux 专用，原生窗口显示，性能更佳
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
