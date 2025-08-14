import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Container,
  Globe,
  Terminal,
  CheckCircle,
  Copy,
  ExternalLink,
  GitBranch,
  Code,
  ArrowRight,
  Package,
  Rocket,
  Shield,
  ChevronLeft,
  Play,
  Badge,
} from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PageLayout } from '../components/common/PageLayout';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useToast } from '../hooks/use-toast';

// 导入设备图片
import proWhiteImg from '../assets/deviceMockup/pro-white.png';
import classic1sImg from '../assets/deviceMockup/classic1s.png';
import Confetti from 'react-confetti';

// 优化的动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const cardHoverVariants = {
  hover: {
    scale: 1.01,
    y: -2,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.99,
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

// 模拟器步骤类型
interface EmulatorStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'pending' | 'active' | 'completed';
}

// 设备类型
interface DeviceType {
  id: 'pro' | 'classic';
  name: string;
  description: string;
  image: string;
  features: string[];
  commands: {
    vnc: string;
    x11: string;
  };
}

const EmulatorPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<'pro' | 'classic' | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [direction, setDirection] = useState(0);

  // 优化的步骤配置 - 减少绿色使用
  const steps: EmulatorStep[] = [
    {
      id: 'setup',
      title: t('emulator.steps.setup.title'),
      description: t('emulator.steps.setup.description'),
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      borderColor: 'border-blue-200 dark:border-blue-800',
      status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending',
    },
    {
      id: 'device',
      title: t('emulator.steps.device.title'),
      description: t('emulator.steps.device.description'),
      icon: Monitor,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
    },
    {
      id: 'launch',
      title: t('emulator.steps.launch.title'),
      description: t('emulator.steps.launch.description'),
      icon: Rocket,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/50',
      borderColor: 'border-purple-200 dark:border-purple-800',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
    },
    {
      id: 'connect',
      title: t('emulator.steps.connect.title'),
      description: t('emulator.steps.connect.description'),
      icon: Shield,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/50',
      borderColor: 'border-teal-200 dark:border-teal-800',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending',
    },
  ];

  // 设备配置
  const devices: DeviceType[] = [
    {
      id: 'pro',
      name: 'OneKey Pro',
      description: t('emulator.devices.pro.description'),
      image: proWhiteImg,
      features: [],
      commands: {
        vnc: 'bash build-emu.sh pro-emu',
        x11: 'bash build-emu.sh pro-emu --x11',
      },
    },
    {
      id: 'classic',
      name: 'OneKey Classic 1s',
      description: t('emulator.devices.classic.description'),
      image: classic1sImg,
      features: [],
      commands: {
        vnc: 'bash build-emu.sh 1s-emu',
        x11: 'bash build-emu.sh 1s-emu --x11',
      },
    },
  ];

  const cloneCommand = 'git clone https://github.com/Johnwanzi/onekey-docker.git';

  // 回退到上一步
  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
      if (currentStep === 1) {
        setSelectedDevice(null);
      }
    }
  };

  // 继续到下一步（无需复制）
  const continueToNext = () => {
    setDirection(1);
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1 && selectedDevice) {
      setCurrentStep(2);
    }
  };

  // 复制命令到剪贴板
  const copyToClipboard = async (text: string, commandId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(commandId);
      toast({
        title: t('emulator.copied'),
        description: t('emulator.copiedDesc'),
      });

      // 根据命令类型推进步骤
      if ((commandId.includes('vnc') || commandId.includes('x11')) && currentStep === 2) {
        setTimeout(() => {
          setDirection(1);
          setCurrentStep(3);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 500);
      }

      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      toast({
        title: t('emulator.copyFailed'),
        description: t('emulator.copyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  // 设备选择处理
  const handleDeviceSelect = (deviceId: 'pro' | 'classic') => {
    setSelectedDevice(deviceId);
  };

  return (
    <PageLayout fixedHeight={true}>
      {/* 庆祝动画 */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 py-3 min-h-0 h-full">
        {/* 面包屑导航 */}
        <div className="flex-shrink-0 mb-3">
          <Breadcrumb items={[{ label: t('emulator.title'), icon: Container }]} />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto"
        >
          {/* 现代化的页面标题 */}
          <motion.div variants={itemVariants} className="text-center py-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t('emulator.title')}
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto">
                {t('emulator.subtitle')}
              </p>
            </div>
          </motion.div>

          {/* 优雅的进度指示器 */}
          <motion.div variants={itemVariants} className="pb-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-start mb-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1 relative">
                      <motion.div
                        className={`
                          w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 mb-2 relative z-10
                          ${
                            step.status === 'completed'
                              ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-lg'
                              : step.status === 'active'
                              ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 shadow-xl ring-4 ring-slate-900/10 dark:ring-slate-100/10'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                          }
                        `}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </motion.div>
                      <div className="text-center">
                        <div
                          className={`text-xs font-semibold mb-1 ${
                            step.status === 'active'
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {step.title}
                        </div>
                        <div
                          className={`text-xs ${
                            step.status === 'active'
                              ? 'text-slate-600 dark:text-slate-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {step.description}
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <motion.div
                          className={`absolute top-5 left-1/2 w-full h-px ${
                            currentStep > index
                              ? 'bg-slate-900 dark:bg-slate-100'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                          style={{ zIndex: 0 }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: currentStep > index ? 1 : 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 当前步骤信息和资源链接 */}
              <div className="text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                  第 {currentStep + 1} 步，共 {steps.length} 步
                </p>

                {/* 开发资源快捷链接 */}
                <div className="inline-flex items-center bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg px-3 py-2 space-x-3 border border-slate-200/50 dark:border-slate-600/50">
                  <button
                    onClick={() =>
                      window.open('https://github.com/Johnwanzi/onekey-docker', '_blank')
                    }
                    className="inline-flex items-center space-x-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium"
                  >
                    <GitBranch className="h-4 w-4" />
                    <span>Git仓库</span>
                  </button>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                  <button
                    onClick={() => {
                      toast({
                        title: t('emulator.docInProgress'),
                        description: t('emulator.docInProgressDesc'),
                      });
                    }}
                    className="inline-flex items-center space-x-1.5 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-medium"
                  >
                    <Code className="h-4 w-4" />
                    <span>文档</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 步骤内容 - 现代化设计 */}
          <div
            className={`relative overflow-hidden max-w-4xl mx-auto ${
              currentStep === 3
                ? 'min-h-[420px]'
                : currentStep === 2
                ? 'min-h-[450px]'
                : 'min-h-[350px]'
            }`}
          >
            <AnimatePresence custom={direction}>
              {/* 步骤 0: 下载设置脚本 */}
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <Package className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        <span>{steps[0].title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground text-sm">
                        {t('emulator.steps.setup.longDescription')}
                      </p>

                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">
                            {t('emulator.cloneRepository')}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cloneCommand, 'clone')}
                            className="h-8 px-3 text-xs"
                          >
                            {copiedCommand === 'clone' ? (
                              <CheckCircle className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-muted rounded-md p-3">
                          <code className="text-xs font-mono">{cloneCommand}</code>
                        </div>
                      </div>

                      {/* 明确的下一步按钮 */}
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-muted-foreground">Clone Repo to local</div>
                        <Button
                          onClick={continueToNext}
                          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 border-0"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 步骤 1: 选择设备 */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Monitor className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                          <span>{steps[1].title}</span>
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={goBack}>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {devices.map(device => (
                          <motion.div
                            key={device.id}
                            variants={cardHoverVariants}
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => handleDeviceSelect(device.id)}
                            className={`
                              relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                              ${
                                selectedDevice === device.id
                                  ? 'border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                                  : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-600'
                              }
                            `}
                          >
                            {selectedDevice === device.id && (
                              <motion.div
                                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 dark:bg-slate-200 rounded-full flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className="h-3 w-3 text-white dark:text-slate-800" />
                              </motion.div>
                            )}

                            <div className="text-center space-y-2">
                              <img
                                src={device.image}
                                alt={device.name}
                                className="h-14 w-auto mx-auto object-contain"
                              />
                              <div>
                                <h3 className="font-semibold text-sm">{device.name}</h3>
                                <p className="text-muted-foreground text-xs">
                                  {device.description}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* 明确的下一步按钮 */}
                      <div className="flex justify-between items-center pt-3">
                        <div className="text-xs text-muted-foreground">
                          Select a device type to continue
                        </div>
                        <Button
                          onClick={continueToNext}
                          disabled={!selectedDevice}
                          className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 disabled:bg-slate-400 text-white dark:text-slate-900 border-0"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 步骤 2: 启动模拟器 */}
              {currentStep === 2 && selectedDevice && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Rocket className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                          <span>{steps[2].title}</span>
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={goBack}>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-sm font-semibold mb-1">
                          {t('emulator.launchingDevice')}{' '}
                          {devices.find(d => d.id === selectedDevice)?.name}
                        </h3>
                        <p className="text-muted-foreground text-xs">
                          {t('emulator.selectLaunchMode')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* VNC 模式 */}
                        <motion.div
                          className="border border-border rounded-lg p-3 space-y-2"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            <span className="font-medium text-sm">{t('emulator.vncMode')}</span>
                            <Badge className="text-xs py-0 px-2">{t('emulator.recommended')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('emulator.vncDescription')}
                          </p>
                          <div className="bg-muted rounded-md p-2">
                            <code className="text-xs font-mono break-all">
                              {devices.find(d => d.id === selectedDevice)?.commands.vnc}
                            </code>
                          </div>
                          <Button
                            onClick={() =>
                              copyToClipboard(
                                devices.find(d => d.id === selectedDevice)?.commands.vnc || '',
                                `${selectedDevice}-vnc`
                              )
                            }
                            size="sm"
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 border-0"
                          >
                            {copiedCommand === `${selectedDevice}-vnc` ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('emulator.copied')}
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Launch VNC Mode
                              </>
                            )}
                          </Button>
                        </motion.div>

                        {/* X11 模式 */}
                        <motion.div
                          className="border border-border rounded-lg p-3 space-y-2"
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <div className="flex items-center space-x-2">
                            <Terminal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            <span className="font-medium text-sm">{t('emulator.x11Mode')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('emulator.x11Description')}
                          </p>
                          <div className="bg-muted rounded-md p-2">
                            <code className="text-xs font-mono break-all">
                              {devices.find(d => d.id === selectedDevice)?.commands.x11}
                            </code>
                          </div>
                          <Button
                            onClick={() =>
                              copyToClipboard(
                                devices.find(d => d.id === selectedDevice)?.commands.x11 || '',
                                `${selectedDevice}-x11`
                              )
                            }
                            size="sm"
                            className="w-full bg-slate-700 hover:bg-slate-600 dark:bg-slate-300 dark:hover:bg-slate-200 text-white dark:text-slate-900 border-0"
                          >
                            {copiedCommand === `${selectedDevice}-x11` ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('emulator.copied')}
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Launch X11 Mode
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">
                          Copy and run one of the commands above to start your emulator
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 步骤 3: 连接到应用 */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Shield className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                          <span>{steps[3].title}</span>
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={goBack}>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center space-y-3">
                        <motion.div
                          className="flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto border border-slate-200 dark:border-slate-700"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
                        >
                          <CheckCircle className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {t('emulator.congratulations')}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {t('emulator.emulatorReady')}
                          </p>
                        </motion.div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-sm text-slate-900 dark:text-slate-100 text-center">
                          {t('emulator.nextSteps')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {/* 第一步 */}
                          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="flex items-center justify-center w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full text-xs font-medium">
                                1
                              </span>
                              <h5 className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                访问模拟器界面
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              VNC模式，在浏览器中查看
                            </p>
                            <button
                              onClick={() =>
                                window.open('http://localhost:6088/vnc.html', '_blank')
                              }
                              className="w-full inline-flex items-center justify-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md py-2 px-3 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>打开 localhost:6088</span>
                            </button>
                          </div>

                          {/* 第二步 */}
                          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="flex items-center justify-center w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full text-xs font-medium">
                                2
                              </span>
                              <h5 className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                切换连接方式
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              在首页选择模拟器传输方式
                            </p>
                            <button
                              onClick={() => navigate('/')}
                              className="w-full inline-flex items-center justify-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md py-2 px-3 transition-colors"
                            >
                              <ArrowRight className="h-3 w-3" />
                              <span>返回首页</span>
                            </button>
                          </div>

                          {/* 第三步 */}
                          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="flex items-center justify-center w-5 h-5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full text-xs font-medium">
                                3
                              </span>
                              <h5 className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                开始开发测试
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              使用完整的硬件钱包功能进行开发和测试
                            </p>
                            <div className="mt-2 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
};

EmulatorPage.displayName = 'EmulatorPage';
export default EmulatorPage;
