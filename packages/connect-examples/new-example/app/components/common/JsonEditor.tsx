import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Button } from "../ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/Dialog";
import { Alert, AlertDescription } from "../ui/Alert";
import { Edit, Save, X } from "lucide-react";

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
  (
    {
      data,
      onSave,
      disabled = false,
      onCopy,
      isEditing = false,
      onEditingChange,
    },
    ref
  ) => {
    const [editValue, setEditValue] = useState("");
    const [error, setError] = useState<string | null>(null);

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
        setEditValue("{}");
      }
      setError(null);
      onEditingChange?.(true);
    }, [data, onEditingChange]);

    const handleCopy = async (): Promise<boolean> => {
      if (data) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
          onCopy?.();
          return true;
        } catch (err) {
          console.error("复制失败:", err);
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
        setError("JSON格式不正确，请检查语法");
      }
    };

    const handleCancel = useCallback(() => {
      onEditingChange?.(false);
      setError(null);
    }, [onEditingChange]);

    // 监听外部编辑状态变化
    useEffect(() => {
      if (isEditing && !disabled) {
        handleOpen();
      } else if (!isEditing) {
        handleCancel();
      }
    }, [isEditing, disabled, handleOpen, handleCancel]);

    return (
      <>
        {data ? (
          <div className="relative">
            <pre className="bg-gradient-to-br from-muted/20 to-muted/40 p-4 rounded-xl text-xs overflow-auto max-h-80 border border-border/30 text-foreground font-mono leading-relaxed shadow-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
            <div className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md">
                JSON
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-muted/20 p-8 rounded-xl text-center border-2 border-dashed border-border/30">
            <p className="text-muted-foreground text-sm">暂无数据</p>
          </div>
        )}

        <Dialog open={isEditing} onOpenChange={onEditingChange}>
          <DialogContent className="bg-card border-border/50 max-w-4xl max-h-[80vh] flex flex-col shadow-xl">
            <DialogHeader className="flex-shrink-0 border-b border-border/50 pb-4">
              <DialogTitle className="text-foreground flex items-center gap-2 text-lg font-semibold">
                <Edit className="h-5 w-5 text-muted-foreground" />
                编辑 JSON 内容
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 space-y-4 min-h-0 py-4">
              <div className="space-y-3">
                <label
                  htmlFor="json-textarea"
                  className="text-sm font-medium text-foreground"
                >
                  JSON内容
                </label>
                <textarea
                  id="json-textarea"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-96 p-4 text-sm font-mono bg-muted/10 border border-border rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none transition-all duration-200 shadow-sm"
                  placeholder="请输入JSON格式的数据..."
                />
              </div>

              {error && (
                <Alert
                  variant="warning"
                  className="border-orange-200/50 bg-orange-50/50 rounded-lg"
                >
                  <X className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 gap-3 border-t border-border/50 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-border text-foreground hover:bg-muted/50 transition-colors duration-200"
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                variant="default"
                className="bg-foreground hover:bg-foreground/90 text-background shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

JsonEditor.displayName = "JsonEditor";

export default JsonEditor;
