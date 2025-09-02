import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ExternalLink } from 'lucide-react';
import type { ParameterField, UnifiedMethodConfig } from '../../data/types';
import { useHardwareStore } from '../../store/hardwareStore';
import { Alert, AlertDescription } from '../ui/Alert';
import { parseParameterValue } from '../../utils/parameterUtils';
import type { CommonParametersState } from '../../store/hardwareStore';
import { METHODS_REQUIRING_PASSPHRASE_CHECK } from '../../utils/constants';

interface ParameterInputProps {
  methodConfig: UnifiedMethodConfig;
  selectedPreset: string | null;
  onPresetChange: (presetTitle: string) => void;
  onParamChange?: (paramName: string, value: unknown) => void;
}

// 需要passphrase检查的方法列表

// 通用配置函数 - 只在需要时显示passphrase相关参数
const getCommonParameters = (t: (key: string) => string, methodName: string): ParameterField[] => {
  const needsPassphrase = METHODS_REQUIRING_PASSPHRASE_CHECK.includes(methodName);

  if (!needsPassphrase) {
    return [];
  }

  return [
    {
      name: 'useEmptyPassphrase',
      type: 'boolean',
      label: t('components.parameterInput.useEmptyPassphrase'),
      description: '', // 移除描述以节省空间
      value: false,
      visible: true,
      editable: true,
    },
    {
      name: 'passphraseState',
      type: 'string',
      label: t('components.parameterInput.passphraseState'),
      description: '', // 移除描述以节省空间
      value: '',
      visible: true,
      editable: true,
    },
    {
      name: 'deriveCardano',
      type: 'boolean',
      label: t('components.parameterInput.deriveCardano'),
      description: '', // 移除描述以节省空间
      value: false,
      visible: true,
      editable: true,
    },
  ];
};

const ParameterInput: React.FC<ParameterInputProps> = ({
  methodConfig,
  selectedPreset,
  onPresetChange,
  onParamChange,
}) => {
  const { t } = useTranslation();
  const {
    commonParameters,
    methodParameters,
    setCommonParameter,
    setMethodParameter,
    setMethodParameters,
    setCommonParameters,
  } = useHardwareStore();

  // 获取预设值
  const presets = useMemo(() => methodConfig.presets || [], [methodConfig.presets]);

  const hasBundleParam = methodParameters.bundle !== undefined && methodParameters.bundle !== null;

  // 获取参数值的统一函数
  const getParameterValue = (field: ParameterField): unknown => {
    if (['useEmptyPassphrase', 'passphraseState', 'deriveCardano'].includes(field.name)) {
      return commonParameters[field.name as keyof typeof commonParameters];
    }
    // 优先使用当前输入的值，如果没有则使用预设值
    return methodParameters[field.name] ?? field.value;
  };

  // 获取可见的方法参数
  const visibleMethodParameters = useMemo((): ParameterField[] => {
    console.log('[ParameterInput] 调试信息:', {
      method: methodConfig.method,
      hasBundleParam,
      selectedPreset,
      presetsLength: presets?.length || 0,
      presets: presets?.map(p => ({
        title: p.title,
        parametersLength: p.parameters?.length || 0,
        parameters: p.parameters?.map(param => ({
          name: param.name,
          type: param.type,
          visible: param.visible,
          value: param.value,
        })),
      })),
    });

    const commonParamNames = ['useEmptyPassphrase', 'passphraseState', 'deriveCardano'];

    // 使用统一的预设方式获取参数
    if (selectedPreset && presets) {
      const preset = presets.find(p => p.title === selectedPreset);
      console.log('[ParameterInput] 找到的预设:', {
        preset: preset
          ? {
              title: preset.title,
              parametersLength: preset.parameters?.length || 0,
              parameters: preset.parameters?.map(param => ({
                name: param.name,
                type: param.type,
                visible: param.visible,
                value: param.value,
                shouldFilter:
                  param.visible === false ||
                  commonParamNames.includes(param.name) ||
                  param.name === 'bundle',
              })),
            }
          : null,
      });

      if (preset && preset.parameters) {
        console.log(
          '[ParameterInput] 预设参数:',
          preset.parameters.map(param => ({
            name: param.name,
            type: param.type,
            visible: param.visible,
            value: param.value,
          }))
        );

        // 过滤掉通用参数、不可见参数和 bundle 参数
        const filtered = preset.parameters.filter(
          (param: ParameterField) =>
            param.visible !== false &&
            !commonParamNames.includes(param.name) &&
            param.name !== 'bundle' // 排除 bundle 参数
        );
        console.log(
          '[ParameterInput] 过滤后的参数:',
          filtered.map(param => ({
            name: param.name,
            type: param.type,
            visible: param.visible,
            value: param.value,
          }))
        );
        console.log('[ParameterInput] 使用预设参数:', filtered.length);
        return filtered;
      }
    }

    console.log('[ParameterInput] 无参数可显示');
    return []; // 没有可显示的参数
  }, [methodConfig, hasBundleParam, selectedPreset, presets]);

  // 参数变化处理
  const handleParamChange = (paramName: string, value: unknown) => {
    if (paramName === 'useEmptyPassphrase' || paramName === 'passphraseState' || paramName === 'deriveCardano') {
      setCommonParameter(paramName as keyof typeof commonParameters, value);
      return;
    }

    // 使用统一的参数处理工具
    const processedValue = parseParameterValue(paramName, value);
    setMethodParameter(paramName, processedValue);

    onParamChange?.(paramName, value);
  };

  // 预设选择处理
  const handlePresetChange = (presetTitle: string) => {
    const preset = presets.find(p => p.title === presetTitle);
    if (preset && preset.parameters) {
      const newMethodParams: Record<string, unknown> = {};
      const newCommonParams: Partial<CommonParametersState> = {};

      // 从预设参数中获取值
      preset.parameters.forEach((param: ParameterField) => {
        if (param.value !== undefined) {
          // 显式处理通用参数
          if (param.name === 'useEmptyPassphrase') {
            newCommonParams.useEmptyPassphrase = Boolean(param.value);
          } else if (param.name === 'passphraseState') {
            newCommonParams.passphraseState = String(param.value);
          } else if (param.name === 'deriveCardano') {
            newCommonParams.deriveCardano = Boolean(param.value);
          } else {
            // 普通方法参数
            newMethodParams[param.name] = parseParameterValue(param.name, param.value);
          }
        }
      });
      setMethodParameters(newMethodParams);
      // 更新通用参数到 store，这将覆盖当前手动输入的值
      // 这里的处理逻辑是：如果预设包含了common参数，则直接应用。
      // 如果用户后续手动修改了，会再次覆盖。
      if (Object.keys(newCommonParams).length > 0) {
        setCommonParameters(newCommonParams);
      }
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
          title: t('components.firmwareFileUpload.firmwareFile'),
          description: t('components.firmwareFileUpload.firmwareDesc'),
        };
      }
      if (/bootloader/i.test(paramName)) {
        return {
          accept: '.bin',
          title: t('components.firmwareFileUpload.bootloaderFile'),
          description: t('components.firmwareFileUpload.bootloaderDesc'),
        };
      }
      if (/ble/i.test(paramName)) {
        return {
          accept: '.bin',
          title: t('components.firmwareFileUpload.bleFile'),
          description: t('components.firmwareFileUpload.bleDesc'),
        };
      }
      if (/resource/i.test(paramName)) {
        return {
          accept: '.zip',
          title: t('components.firmwareFileUpload.resourceFile'),
          description: t('components.firmwareFileUpload.resourceDesc'),
        };
      }
      // 默认配置
      return {
        accept: '.bin',
        title: t('components.firmwareFileUpload.firmwareFile'),
        description: t('components.firmwareFileUpload.firmwareDesc'),
      };
    };

    return getConfigByPattern();
  };

  // 渲染通用标签 - 只显示字段名称
  const renderFieldLabel = (field: ParameterField) => (
    <label htmlFor={field.name} className="text-xs font-medium text-foreground cursor-pointer">
      {field.name}
      {field.required && <span className="text-orange-600">*</span>}
    </label>
  );

  // 渲染文件选择器
  const renderFilePicker = (field: ParameterField) => {
    const config = getFileParameterConfig(field.name);
    const currentValue = getParameterValue(field) as File | null;

    // 优先使用字段配置的accept，否则使用默认配置
    const acceptTypes = field.accept || config.accept;

    return (
      <div key={field.name} className="flex items-center gap-2">
        <div className="min-w-0 flex-shrink-0 w-32">{renderFieldLabel(field)}</div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input
              type="file"
              accept={acceptTypes}
              onChange={e => {
                const file = e.target.files?.[0] || null;
                handleParamChange(field.name, file);
              }}
              className="absolute inset-0 w-full h-full opacity-0 z-10"
            />
            <div className="bg-background border border-border rounded-md px-3 py-1.5 text-xs hover:bg-muted/50 hover:border-primary cursor-pointer transition-colors select-none">
              {currentValue ? (
                <span className="text-foreground cursor-pointer">{currentValue.name}</span>
              ) : (
                <span className="text-muted-foreground cursor-pointer">
                  {t('components.parameterInput.selectFirmwareFile', { title: config.title })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染Checkbox输入
  const renderCheckbox = (field: ParameterField) => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    return (
      <div key={field.name} className="flex items-center gap-2">
        <div className="min-w-0 flex-shrink-0 w-32">{renderFieldLabel(field)}</div>
        <div className="flex-1 min-w-0">
          <Checkbox
            id={field.name}
            checked={Boolean(value)}
            onCheckedChange={checked =>
              isEditable && handleParamChange(field.name, checked === true)
            }
            disabled={!isEditable}
          />
        </div>
      </div>
    );
  };

  // 渲染文本输入
  const renderInput = (field: ParameterField, type: string = 'text') => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    // 对于 textarea 类型，如果值是对象，需要序列化为 JSON 字符串显示
    const getDisplayValue = (val: unknown): string => {
      if (field.type === 'textarea' && typeof val === 'object' && val !== null) {
        return JSON.stringify(val, null, 2);
      }
      return String(val || '');
    };

    return (
      <div key={field.name} className="flex items-center gap-2">
        <div className="min-w-0 flex-shrink-0 w-32">{renderFieldLabel(field)}</div>
        <div className="flex-1 min-w-0">
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              value={getDisplayValue(value)}
              onChange={e => {
                if (!isEditable) return;
                handleParamChange(field.name, e.target.value);
              }}
              placeholder={field.placeholder}
              disabled={!isEditable}
              rows={3}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ) : (
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
              className="bg-background border-border focus:border-primary text-xs h-7"
              {...(field.validation && {
                pattern: field.validation.pattern,
                min: field.validation.min,
                max: field.validation.max,
                minLength: field.validation.min,
                maxLength: field.validation.max,
              })}
            />
          )}
        </div>
      </div>
    );
  };

  // 渲染Select
  const renderSelect = (field: ParameterField) => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    return (
      <div key={field.name} className="flex items-center gap-2">
        <div className="min-w-0 flex-shrink-0 w-32">{renderFieldLabel(field)}</div>
        <div className="flex-1 min-w-0">
          <Select
            value={String(value || '')}
            onValueChange={newValue => isEditable && handleParamChange(field.name, newValue)}
            disabled={!isEditable}
          >
            <SelectTrigger
              id={field.name}
              className="bg-background border-border focus:border-primary text-xs h-7"
            >
              <SelectValue
                placeholder={
                  field.placeholder || `${t('common.select')}${field.label || field.name}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => {
                // 支持字符串和对象两种格式
                if (typeof option === 'string') {
                  return (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  );
                } else {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {String(option.label)}
                    </SelectItem>
                  );
                }
              })}
            </SelectContent>
          </Select>
        </div>
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

  const hasPresets = presets && presets.length > 0;
  const hasMultiplePresets = presets && presets.length > 1;

  const commonParams = getCommonParameters(t, methodConfig.method);
  const hasCommonParams = commonParams.length > 0;

  return (
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardContent className="space-y-2 pb-2 pt-2">
        {/* 优化的紧凑布局 */}
        <div className="space-y-2">
          {/* 预设选择器 - 如果有多个预设则显示在顶部 */}
          {hasMultiplePresets && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground min-w-0 flex-shrink-0">
                {t('components.parameterInput.selectPreset')}:
              </label>
              <Select value={selectedPreset || ''} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-background border-border focus:border-primary text-xs h-7 flex-1">
                  <SelectValue placeholder={t('components.parameterInput.selectPreset')} />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(preset => (
                    <SelectItem key={preset.title} value={preset.title}>
                      {preset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 参数区域 - 紧凑两列布局 */}
          <div className={`grid grid-cols-1 gap-2 ${hasCommonParams ? 'md:grid-cols-2' : ''}`}>
            {/* 通用参数 - 只在需要passphrase的方法中显示 */}
            {hasCommonParams && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-medium text-foreground">
                    {t('components.parameterInput.commonParameters')}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        'https://developer.onekey.so/connect-to-hardware/page-1/common-params',
                        '_blank'
                      )
                    }
                    className="h-3 px-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-2 w-2" />
                  </Button>
                </div>
                <div className="space-y-1">{commonParams.map(renderParameterField)}</div>
              </div>
            )}

            {/* 方法参数 */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-medium text-foreground">
                  {t('components.parameterInput.methodParameters')}
                </h4>
                {selectedPreset && (
                  <span className="text-xs text-muted-foreground">({selectedPreset})</span>
                )}
              </div>
              {visibleMethodParameters.length > 0 ? (
                <div className="space-y-1">{visibleMethodParameters.map(renderParameterField)}</div>
              ) : (
                <div className="text-center py-1">
                  <p className="text-xs text-muted-foreground">
                    {hasBundleParam
                      ? t('components.parameterInput.parametersInBundle')
                      : hasPresets && selectedPreset
                      ? t('components.parameterInput.noAdditionalParams')
                      : hasPresets
                      ? t('components.parameterInput.selectPresetFirst')
                      : t('components.parameterInput.noAdditionalParams')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bundle参数提示 - 更紧凑 */}
        {hasBundleParam && (
          <Alert className="border-border bg-muted/20 py-1">
            <AlertDescription className="text-muted-foreground text-xs">
              <strong>{t('components.parameterInput.batchMode')}</strong>
              {t('components.parameterInput.batchModeDesc')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ParameterInput;
