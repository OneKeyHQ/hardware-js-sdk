import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { ExternalLink } from "lucide-react";
import type { ParameterField, MethodConfig, MethodPreset } from "~/data/types";
import { useHardwareStore } from "~/store/hardwareStore";
import { Alert, AlertDescription } from "../ui/Alert";

interface ParameterInputProps {
  methodConfig: MethodConfig;
  selectedPreset: string | null;
  onPresetChange: (presetTitle: string) => void;
  onParamChange?: (paramName: string, value: unknown) => void;
}

// 通用配置
const COMMON_PARAMETERS: ParameterField[] = [
  {
    name: "useEmptyPassphrase",
    type: "boolean",
    label: "useEmptyPassphrase",
    description: "使用空passphrase，跳过输入弹窗",
    default: false,
    visible: true,
    editable: true,
  },
  // UI辅助参数
  {
    name: "usePassphraseState",
    type: "boolean",
    label: "是否使用passPhraseState",
    description: "设备中已保存的passphrase状态字符串",
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

  // 获取方法参数（过滤通用参数）
  const allParameters = methodConfig.parameters || [];
  const hasBundleParam =
    methodParameters.bundle !== undefined && methodParameters.bundle !== null;

  // 获取参数值的统一函数
  const getParameterValue = (field: ParameterField): unknown => {
    if (
      field.name === "useEmptyPassphrase" ||
      field.name === "passphraseState" ||
      field.name === "usePassphraseState"
    ) {
      return commonParameters[field.name as keyof typeof commonParameters];
    }
    return methodParameters[field.name];
  };

  // 获取可见的配置参数
  const getVisibleConfigParameters = (): ParameterField[] => {
    const allowedParams = ["path", "showOnOneKey"];
    let configParams = allParameters.filter(
      (param: ParameterField) =>
        param.visible !== false && allowedParams.includes(param.name)
    );

    if (hasBundleParam) return [];

    if (selectedPreset && methodConfig.presets) {
      const preset = methodConfig.presets.find(
        (p: MethodPreset) => p.title === selectedPreset
      );
      if (preset?.visibleFields) {
        configParams = configParams.filter((param: ParameterField) =>
          preset.visibleFields?.includes(param.name)
        );
      }
    }
    return configParams;
  };

  // 参数变化处理
  const handleParamChange = (paramName: string, value: unknown) => {
    if (paramName === "usePassphraseState") {
      const boolValue = Boolean(value);
      if (boolValue) setCommonParameter("useEmptyPassphrase", false);
      setCommonParameter("usePassphraseState", boolValue);
      return;
    }

    if (paramName === "useEmptyPassphrase") {
      setCommonParameter("useEmptyPassphrase", Boolean(value));
      if (value) setCommonParameter("usePassphraseState", false);
      return;
    }

    // 通用参数或方法参数
    if (paramName === "passphraseState") {
      setCommonParameter(paramName, value);
    } else {
      setMethodParameter(paramName, value);
    }

    onParamChange?.(paramName, value);
  };

  // 预设选择处理
  const handlePresetChange = (presetTitle: string) => {
    const preset = methodConfig.presets?.find((p) => p.title === presetTitle);
    if (preset) {
      setMethodParameters({});
      const defaultParams: Record<string, unknown> = {};
      allParameters.forEach((param) => {
        if (param.default !== undefined) {
          defaultParams[param.name] = param.default;
        }
      });
      setMethodParameters({ ...defaultParams, ...preset.values });
    }
    onPresetChange(presetTitle);
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

  // 渲染Checkbox输入
  const renderCheckbox = (field: ParameterField) => {
    const value = getParameterValue(field);
    const isEditable = field.editable !== false;

    // passphraseState特殊处理
    if (field.name === "usePassphraseState") {
      const isDisabled = commonParameters.passphraseState === "";

      return (
        <div key={field.name} className="space-y-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id={field.name}
              checked={
                Boolean(value) && commonParameters.passphraseState !== ""
              }
              onCheckedChange={(checked) =>
                isEditable &&
                !isDisabled &&
                handleParamChange(field.name, checked === true)
              }
              disabled={isDisabled}
              className="mt-1"
            />
            <div className="space-y-1">
              <label
                htmlFor={field.name}
                className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${
                  isDisabled
                    ? "text-muted-foreground opacity-50"
                    : "text-foreground"
                }`}
              >
                {field.label || field.name}
                {field.required && <span className="text-orange-600">*</span>}
              </label>
              <p
                className={`text-xs ${
                  isDisabled
                    ? "text-muted-foreground opacity-50"
                    : "text-muted-foreground"
                }`}
              >
                {isDisabled
                  ? "目前无passphraseState"
                  : commonParameters.passphraseState}
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
            onCheckedChange={(checked) =>
              isEditable && handleParamChange(field.name, checked === true)
            }
            disabled={!isEditable}
            className="mt-1"
          />
          <div className="space-y-1">
            {renderFieldLabel(field)}
            {field.description && (
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染文本输入
  const renderInput = (field: ParameterField, type: string = "text") => {
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
          value={String(value || "")}
          onChange={(e) => {
            if (!isEditable) return;
            const newValue =
              type === "number" && e.target.value
                ? Number(e.target.value)
                : e.target.value;
            handleParamChange(field.name, newValue);
          }}
          placeholder={field.placeholder}
          disabled={!isEditable}
          className={`bg-background border-border focus:border-primary ${
            field.type === "textarea" ? "h-20 resize-none" : ""
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
          value={String(value || "")}
          onValueChange={(newValue) =>
            isEditable && handleParamChange(field.name, newValue)
          }
          disabled={!isEditable}
        >
          <SelectTrigger
            id={field.name}
            className="bg-background border-border focus:border-primary"
          >
            <SelectValue
              placeholder={
                field.placeholder || `选择${field.label || field.name}`
              }
            />
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
      case "boolean":
        return renderCheckbox(field);
      case "string":
        return renderInput(field);
      case "number":
        return renderInput(field, "number");
      case "textarea":
        return renderInput(field);
      case "select":
        return renderSelect(field);
      default:
        return renderInput(field);
    }
  };

  const visibleConfigParameters = getVisibleConfigParameters();
  const hasPresets = methodConfig.presets && methodConfig.presets.length > 0;

  return (
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="text-foreground">执行参数</span>
          {methodConfig.dangerous && (
            <Badge variant="warning" className="text-xs">
              危险操作
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 预设选择 */}
          {hasPresets && (
            <div className="space-y-1">
              <label
                htmlFor="preset-select"
                className="text-sm font-medium text-foreground"
              >
                快捷预设
              </label>
              <Select
                value={selectedPreset || ""}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger
                  id="preset-select"
                  className="bg-background border-border focus:border-primary h-8"
                >
                  <SelectValue placeholder="选择预设配置" />
                </SelectTrigger>
                <SelectContent>
                  {methodConfig.presets!.map((preset: MethodPreset) => (
                    <SelectItem key={preset.title} value={preset.title}>
                      <div>
                        <div className="font-medium">{preset.title}</div>
                        {preset.description && (
                          <div className="text-xs text-muted-foreground">
                            {preset.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 通用参数 */}
          <div className="space-y-1">
            <div className="flex items-center">
              <h4 className="text-sm font-medium text-foreground mr-2">
                通用参数
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  window.open(
                    "https://developer.onekey.so/connect-to-hardware/page-1/common-params",
                    "_blank"
                  )
                }
                className="h-5 px-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {COMMON_PARAMETERS.map(renderParameterField)}
            </div>
          </div>

          {/* 方法参数 */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-foreground">
              方法参数
              {selectedPreset && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedPreset})
                </span>
              )}
            </h4>
            {visibleConfigParameters.length > 0 ? (
              <div className="space-y-1">
                {visibleConfigParameters.map(renderParameterField)}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  {hasBundleParam
                    ? "参数在 bundle 数组中配置"
                    : "无需配置额外参数"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bundle参数提示 */}
        {hasBundleParam && (
          <Alert className="border-border bg-muted/20 py-2 flex items-center">
            <AlertDescription className="text-muted-foreground text-sm">
              <strong>批量模式：</strong>方法参数在
              <code className="mx-1 px-1 py-0.5 bg-muted/50 rounded text-xs">
                bundle
              </code>
              数组中，外层仅保留通用参数。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ParameterInput;
