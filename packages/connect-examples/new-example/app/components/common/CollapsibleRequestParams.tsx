import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import JsonEditor from "./JsonEditor";

interface CollapsibleRequestParamsProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}

const CollapsibleRequestParams: React.FC<CollapsibleRequestParamsProps> = ({
  data,
  onSave,
  disabled = false,
  className = "",
}) => {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // 复制请求参数
  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "复制成功",
        description: "请求参数已复制到剪贴板",
      });
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "warning",
      });
    }
  };

  return (
    <Card className={`bg-card border border-border/50 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-foreground flex items-center">
            📋 请求参数
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs hover:bg-primary/10 hover:border-primary/30"
              disabled={!data || Object.keys(data).length === 0}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-600" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-7 px-2 text-xs"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  展开
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <JsonEditor data={data} onSave={onSave} disabled={disabled} />
        </CardContent>
      )}
    </Card>
  );
};

export default CollapsibleRequestParams;
