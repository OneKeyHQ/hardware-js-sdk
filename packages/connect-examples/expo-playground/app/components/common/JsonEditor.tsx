import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { Save, X } from 'lucide-react';
import { Textarea } from '../ui/Textarea';

interface JsonEditorProps {
  data: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => void;
  disabled?: boolean;
  onCopy?: () => void; // 外部复制回调
  isEditing?: boolean; // 外部控制编辑状态
  onEditingChange?: (isEditing: boolean) => void; // 编辑状态变化回调
}

export interface JsonEditorRef {
  openEditor: () => void;
  closeEditor: () => void;
  copyContent: () => Promise<boolean>;
}

const JsonEditor = forwardRef<JsonEditorRef, JsonEditorProps>(
  ({ data, onSave, disabled = false, onCopy, isEditing = false, onEditingChange }, ref) => {
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    // 暴露给外部的方法
    useImperativeHandle(ref, () => ({
      openEditor: handleOpen,
      closeEditor: handleCancel,
      copyContent: handleCopy,
    }));

    const handleOpen = useCallback(() => {
      if (data) {
        setEditValue(JSON.stringify(data, null, 2));
      } else {
        setEditValue('{}');
      }
      setError(null);
    }, [data]);

    const handleCopy = async (): Promise<boolean> => {
      if (data) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          onCopy?.();
          return true;
        } catch (err) {
          console.error('复制失败:', err);
          return false;
        }
      }
      return false;
    };

    const handleSave = () => {
      try {
        const parsed = JSON.parse(editValue);
        onSave(parsed);
        onEditingChange?.(false);
        setError(null);
      } catch (err) {
        setError(t('components.jsonEditor.jsonFormatError'));
      }
    };

    const handleCancel = useCallback(() => {
      onEditingChange?.(false);
      setError(null);
    }, [onEditingChange]);

    // 监听外部编辑状态变化 - 只在编辑状态开启时初始化数据
    useEffect(() => {
      if (isEditing && !disabled) {
        if (data) {
          setEditValue(JSON.stringify(data, null, 2));
        } else {
          setEditValue('{}');
        }
        setError(null);
      }
    }, [isEditing, disabled, data]);

    return (
      <>
        {!isEditing ? (
          data ? (
            <div className="relative">
              <pre className="bg-gradient-to-br from-muted/20 to-muted/40 p-2 rounded-lg text-xs overflow-auto max-h-72 md:max-h-80 border border-border/30 text-foreground font-mono leading-tight shadow-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
              <div className="absolute top-1 right-1 opacity-60 hover:opacity-100 transition-opacity">
                <span className="text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded-sm">
                  JSON
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 p-4 rounded-lg text-center border-2 border-dashed border-border/30">
              <p className="text-muted-foreground text-xs">{t('components.jsonEditor.noData')}</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <label htmlFor="json-textarea" className="text-sm font-medium text-foreground">
              {t('components.jsonEditor.jsonContent')}
            </label>
            <Textarea
              id="json-textarea"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="w-full h-72 md:h-80 p-3 text-sm font-mono"
              placeholder={t('components.jsonEditor.enterJsonData')}
            />
            {error && (
              <Alert variant="warning" className="border-orange-200/50 bg-orange-50/50 rounded-lg">
                <X className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 font-medium">{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-border text-foreground hover:bg-muted/50 transition-colors duration-200"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                variant="default"
                className="bg-foreground hover:bg-foreground/90 text-background shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }
);

JsonEditor.displayName = 'JsonEditor';

export default JsonEditor;
