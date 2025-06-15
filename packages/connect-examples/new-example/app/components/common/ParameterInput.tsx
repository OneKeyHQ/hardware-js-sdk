import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ExternalLink } from 'lucide-react';
import type { ParameterField, MethodConfig } from '../../data/types';
import { useHardwareStore } from '../../store/hardwareStore';
import { Alert, AlertDescription } from '../ui/Alert';

import { PlaygroundProps } from '../../data/components/Playground';

// 统一的预设类型
interface UnifiedPreset {
  title: string;
  value: Record<string, unknown>;
}

interface ParameterInputProps {
  methodConfig: MethodConfig | PlaygroundProps;
  selectedPreset: string | null;
  onPresetChange: (presetTitle: string) => void;
  onParamChange?: (paramName: string, value: unknown) => void;
}

// 通用配置
const COMMON_PARAMETERS: ParameterField[] = [
  {
    name: 'useEmptyPassphrase',
    type: 'boolean',
    label: 'useEmptyPassphrase',
    description: '使用空passphrase，跳过输入弹窗',
    default: false,
    visible: true,
    editable: true,
  },
  // UI辅助参数
  {
    name: 'usePassphraseState',
    type: 'boolean',
    label: '是否使用passPhraseState',
    description: '设备中已保存的passphrase状态字符串',
    default: false,
    visible: true,
    editable: true,
  },
];

const ParameterInput: React.FC<ParameterInputProps> = ({
  methodConfig,
  selectedPreset,
  onPresetChange,
  onParamChange,
}) => {
  const {
    commonParameters,
    methodParameters,
    setCommonParameter,
    setMethodParameter,
    setMethodParameters,
  } = useHardwareStore();

  // 统一获取预设的辅助函数
  const getPresets = (): UnifiedPreset[] => {
    if ('presets' in methodConfig && methodConfig.presets) {
      return methodConfig.presets.map(p => ({
        title: p.title,
        value: p.value,
      }));
    }
    if ('presupposes' in methodConfig && methodConfig.presupposes) {
      return methodConfig.presupposes.map(p => ({
        title: p.title,
        value: p.value,
      }));
    }
    return [];
  };

  const presets = getPresets();

  // 智能检测参数类型
  const detectParameterType = (paramName: string): 'file' | 'boolean' | 'string' => {
    // 文件参数检测模式
    const filePatterns = [
      /binary$/i, // 以 binary 结尾
      /file$/i, // 以 file 结尾
      /firmware/i, // 包含 firmware
      /bootloader/i, // 包含 bootloader
      /ble/i, // 包含 ble
      /resource/i, // 包含 resource
    ];

    // 布尔参数检测模式
    const booleanPatterns = [
      /^show/i, // 以 show 开头
      /^use/i, // 以 use 开头
      /^is/i, // 以 is 开头
      /^has/i, // 以 has 开头
      /^enable/i, // 以 enable 开头
      /^disable/i, // 以 disable 开头
      /reboot/i, // 包含 reboot
    ];

    // 检测文件类型
    if (filePatterns.some(pattern => pattern.test(paramName))) {
      return 'file';
    }

    // 检测布尔类型
    if (booleanPatterns.some(pattern => pattern.test(paramName))) {
      return 'boolean';
    }

    // 默认为字符串类型
    return 'string';
  };

  // 获取方法参数（从预设中推断或使用配置的参数）
  const getAllParameters = (): ParameterField[] => {
    // 如果有配置的参数，优先使用
    if ('parameters' in methodConfig && methodConfig.parameters) {
      return methodConfig.parameters;
    }

    // 否则从预设中推断
    if (!presets || presets.length === 0) {
      return [];
    }

    const parameterSet = new Set<string>();
    presets.forEach(preset => {
      Object.keys(preset.value).forEach(key => {
        parameterSet.add(key);
      });
    });

    return Array.from(parameterSet).map(name => {
      const detectedType = detectParameterType(name);

      return {
        name,
        type: detectedType,
        required: false,
        default: undefined,
        visible: true,
        editable: true,
      };
    });
  };

  const allParameters = getAllParameters();
  const hasBundleParam = methodParameters.bundle !== undefined && methodParameters.bundle !== null;

  // 获取参数值的统一函数
  const getParameterValue = (field: ParameterField): unknown => {
    if (field.name === 'useEmptyPassphrase' || field.name === 'usePassphraseState') {
      return commonParameters[field.name as keyof typeof commonParameters];
    }
    return methodParameters[field.name];
  };

  // 获取可见的方法参数
  const getVisibleMethodParameters = (): ParameterField[] => {
    if (hasBundleParam) {
      return [];
    }

    // 过滤掉通用参数
    const commonParamNames = ['useEmptyPassphrase', 'usePassphraseState'];
    let methodParams = allParameters.filter(
      (param: ParameterField) => param.visible !== false && !commonParamNames.includes(param.name)
    );

    // 如果选择了预设，进一步过滤
    if (selectedPreset && presets) {
      const preset = presets.find(p => p.title === selectedPreset);
      if (preset) {
        const presetParamNames = Object.keys(preset.value);
        methodParams = methodParams.filter(param => presetParamNames.includes(param.name));
      }
    }

    return methodParams;
  };

  // 参数变化处理
  const handleParamChange = (paramName: string, value: unknown) => {
    if (paramName === 'usePassphraseState') {
      const boolValue = Boolean(value);
      if (boolValue) setCommonParameter('useEmptyPassphrase', false);
      setCommonParameter('usePassphraseState', boolValue);
      return;
    }

    if (paramName === 'useEmptyPassphrase') {
      setCommonParameter('useEmptyPassphrase', Boolean(value));
      if (value) setCommonParameter('usePassphraseState', false);
      return;
    }

    // 方法参数
    setMethodParameter(paramName, value);

    onParamChange?.(paramName, value);
  };

  // 预设选择处理
  const handlePresetChange = (presetTitle: string) => {
    const preset = presets.find(p => p.title === presetTitle);
    if (preset) {
      // 清空现有方法参数
      setMethodParameters({});

      // 设置预设参数
      const presetParams = preset.value;
      Object.entries(presetParams).forEach(([key, value]) => {
        // 跳过通用参数
        if (!['useEmptyPassphrase', 'passphraseState', 'usePassphraseState'].includes(key)) {
          setMethodParameter(key, value);
        }
      });
    }
    onPresetChange(presetTitle);
  };

  // 获取文件参数配置
  const getFileParameterConfig = (paramName: string) => {
    // 根据参数名称智能推断文件类型配置
    const getConfigByPattern = () => {
      if (/firmware/i.test(paramName)) {
        return {
          accept: '.bin',
          title: '固件文件',
          description: '主固件程序文件，用于更新设备核心功能',
        };
      }
      if (/bootloader/i.test(paramName)) {
        return {
          accept: '.bin',
          title: 'Bootloader文件',
          description: '引导程序文件，用于更新设备启动程序',
        };
      }
      if (/ble/i.test(paramName)) {
        return {
          accept: '.bin',
          title: 'BLE固件文件',
          description: '蓝牙低功耗固件文件，用于更新蓝牙功能',
        };
      }
      if (/resource/i.test(paramName)) {
        return {
          accept: '.zip',
          title: '资源文件',
          description: '设备界面资源包，包含图标、字体等界面元素',
        };
      }
      // 默认配置
      return {
        accept: '.bin',
        title: '固件文件',
        description: '请选择相应的固件文件',
      };
    };

    return getConfigByPattern();
  };

  // 渲染通用标签
  const renderFieldLabel = (field: ParameterField) => (
    <label
      htmlFor={field.name}
      className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
    >
      {field.label || field.name}
      {field.required && <span className="text-orange-600">*</span>}
    </label>
  );

  // 渲染文件选择器
  const renderFilePicker = (field: ParameterField) => {
    const config = getFileParameterConfig(field.name);
    const currentValue = getParameterValue(field) as File | null;

    return (
      <div key={field.name} className="space-y-2">
        <div className="space-y-1">
          {renderFieldLabel(field)}
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <div className="relative">
          <input
            type="file"
            accept={config.accept}
            onChange={e => {
              const file = e.target.files?.[0] || null;
              handleParamChange(field.name, file);
            }}
            className="absolute inset-0 w-full h-full opacity-0 z-10"
          />
          <div className="bg-background border border-border rounded-md px-3 py-2 text-sm hover:bg-muted/50 hover:border-primary cursor-pointer transition-colors select-none">
            {currentValue ? (
              <span className="text-foreground cursor-pointer">{currentValue.name}</span>
            ) : (
              <span className="text-muted-foreground cursor-pointer">选择{config.title}...</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染Checkbox输入
  const renderCheckbox = (field: ParameterField) => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    // usePassphraseState特殊处理
    if (field.name === 'usePassphraseState') {
      const isDisabled = commonParameters.passphraseState === '';

      return (
        <div key={field.name} className="space-y-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id={field.name}
              checked={Boolean(value) && commonParameters.passphraseState !== ''}
              onCheckedChange={checked =>
                isEditable && !isDisabled && handleParamChange(field.name, checked === true)
              }
              disabled={isDisabled}
              className="mt-1"
            />
            <div className="space-y-1">
              <label
                htmlFor={field.name}
                className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${
                  isDisabled ? 'text-muted-foreground opacity-50' : 'text-foreground'
                }`}
              >
                {field.label || field.name}
                {field.required && <span className="text-orange-600">*</span>}
              </label>
              <p
                className={`text-xs ${
                  isDisabled ? 'text-muted-foreground opacity-50' : 'text-muted-foreground'
                }`}
              >
                {isDisabled ? '目前无passphraseState' : commonParameters.passphraseState}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 通用Checkbox
    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-start space-x-3">
          <Checkbox
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={checked =>
              isEditable && handleParamChange(field.name, checked === true)
            }
            disabled={!isEditable}
            className="mt-1"
          />
          <div className="space-y-1">
            {renderFieldLabel(field)}
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染文本输入
  const renderInput = (field: ParameterField, type: string = 'text') => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    return (
      <div key={field.name} className="space-y-2">
        <div className="space-y-1">
          {renderFieldLabel(field)}
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Input
          id={field.name}
          type={type}
          value={String(value || '')}
          onChange={e => {
            if (!isEditable) return;
            const newValue =
              type === 'number' && e.target.value ? Number(e.target.value) : e.target.value;
            handleParamChange(field.name, newValue);
          }}
          placeholder={field.placeholder}
          disabled={!isEditable}
          className={`bg-background border-border focus:border-primary ${
            field.type === 'textarea' ? 'h-20 resize-none' : ''
          }`}
          {...(field.validation && {
            pattern: field.validation.pattern,
            min: field.validation.min,
            max: field.validation.max,
            minLength: field.validation.min,
            maxLength: field.validation.max,
          })}
        />
      </div>
    );
  };

  // 渲染Select
  const renderSelect = (field: ParameterField) => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    return (
      <div key={field.name} className="space-y-2">
        <div className="space-y-1">
          {renderFieldLabel(field)}
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Select
          value={String(value || '')}
          onValueChange={newValue => isEditable && handleParamChange(field.name, newValue)}
          disabled={!isEditable}
        >
          <SelectTrigger
            id={field.name}
            className="bg-background border-border focus:border-primary"
          >
            <SelectValue placeholder={field.placeholder || `选择${field.label || field.name}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // 渲染参数字段（统一入口）
  const renderParameterField = (field: ParameterField) => {
    switch (field.type) {
      case 'file':
        return renderFilePicker(field);
      case 'boolean':
        return renderCheckbox(field);
      case 'string':
        return renderInput(field);
      case 'number':
        return renderInput(field, 'number');
      case 'textarea':
        return renderInput(field);
      case 'select':
        return renderSelect(field);
      default:
        if (field.options && field.options.length > 0) {
          return renderSelect(field);
        }
        return renderInput(field);
    }
  };

  const visibleMethodParameters = getVisibleMethodParameters();
  const hasPresets = presets && presets.length > 0;

  // 检查是否为危险操作
  const isDangerous = 'dangerous' in methodConfig ? methodConfig.dangerous : false;

  return (
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="text-foreground">⚙️ 执行参数</span>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {methodConfig.method}
            </Badge>
            {isDangerous && (
              <Badge variant="warning" className="text-xs">
                危险操作
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={`grid grid-cols-1 gap-6 ${hasPresets ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}
        >
          {/* 快捷预设 - 只在有预设时显示 */}
          {hasPresets && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground border-b border-border/50 pb-2">
                快捷预设
              </h4>
              <Select value={selectedPreset || ''} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-background border-border focus:border-primary">
                  <SelectValue placeholder="选择预设配置" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(preset => (
                    <SelectItem key={preset.title} value={preset.title}>
                      <div>
                        <div className="font-medium">{preset.title}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 通用参数 */}
          <div className="space-y-3">
            <div className="flex items-center border-b border-border/50 pb-2">
              <h4 className="text-sm font-medium text-foreground mr-2">通用参数</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(
                    'https://developer.onekey.so/connect-to-hardware/page-1/common-params',
                    '_blank'
                  )
                }
                className="h-5 px-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-3">{COMMON_PARAMETERS.map(renderParameterField)}</div>
          </div>

          {/* 方法参数 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground border-b border-border/50 pb-2">
              方法参数
              {selectedPreset && (
                <span className="text-xs text-muted-foreground ml-2">({selectedPreset})</span>
              )}
            </h4>
            {visibleMethodParameters.length > 0 ? (
              <div className="space-y-3">{visibleMethodParameters.map(renderParameterField)}</div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  {hasBundleParam
                    ? '参数在 bundle 数组中配置'
                    : hasPresets && selectedPreset
                    ? '无需配置额外参数'
                    : hasPresets
                    ? '请先选择预设配置'
                    : '无需配置额外参数'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bundle参数提示 */}
        {hasBundleParam && (
          <Alert className="border-border bg-muted/20 py-3">
            <AlertDescription className="text-muted-foreground text-sm">
              <strong>批量模式：</strong>方法参数在
              <code className="mx-1 px-1 py-0.5 bg-muted/50 rounded text-xs">bundle</code>
              数组中，外层仅保留通用参数。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ParameterInput;
