import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/use-toast';

interface CollapsibleJsonViewerProps {
  data: unknown;
  maxDepth?: number;
  currentDepth?: number;
}

const CollapsibleJsonViewer: React.FC<CollapsibleJsonViewerProps> = ({
  data,
  maxDepth = 1,
  currentDepth = 0,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  const copyToClipboard = async (value: unknown) => {
    try {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(text);
      toast({
        title: t('components.collapsibleJsonViewer.copied'),
        description: t('components.collapsibleJsonViewer.copyToClipboard'),
      });
    } catch (error) {
      toast({
        title: t('components.collapsibleJsonViewer.copyFailed'),
        description: t('components.collapsibleJsonViewer.cannotCopyToClipboard'),
        variant: 'destructive',
      });
    }
  };

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null) {
      return <span className="text-gray-500 italic">null</span>;
    }

    if (value === undefined) {
      return <span className="text-gray-500 italic">undefined</span>;
    }

    if (typeof value === 'boolean') {
      return <span className="text-blue-600 dark:text-blue-400">{value.toString()}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-green-600 dark:text-green-400">{value}</span>;
    }

    if (typeof value === 'string') {
      return (
        <div className="flex items-start gap-2 group min-w-0">
          <span className="text-orange-600 dark:text-orange-400 break-words whitespace-pre-wrap min-w-0 flex-1 overflow-hidden">
            &quot;{value}&quot;
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(value)}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-foreground transition-opacity flex-shrink-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return <ArrayViewer array={value} currentDepth={currentDepth} maxDepth={maxDepth} />;
    }

    if (typeof value === 'object') {
      return (
        <ObjectViewer
          object={value as Record<string, unknown>}
          currentDepth={currentDepth}
          maxDepth={maxDepth}
        />
      );
    }

    return <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>;
  };

  return (
    <div className="font-mono text-sm break-words whitespace-pre-wrap min-w-0 overflow-hidden">{renderValue(data)}</div>
  );
};

const ObjectViewer: React.FC<{
  object: Record<string, unknown>;
  currentDepth: number;
  maxDepth: number;
}> = ({ object, currentDepth, maxDepth }) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { t } = useTranslation();

  const toggleKey = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const copyObject = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(object, null, 2));
      toast({
        title: t('components.collapsibleJsonViewer.copied'),
        description: t('components.collapsibleJsonViewer.objectCopied'),
      });
    } catch (error) {
      toast({
        title: t('components.collapsibleJsonViewer.copyFailed'),
        description: t('components.collapsibleJsonViewer.cannotCopyToClipboard'),
        variant: 'destructive',
      });
    }
  };

  const keys = Object.keys(object);

  if (keys.length === 0) {
    return <span className="text-gray-500">{'{}'}</span>;
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-gray-400">{'{'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyObject}
          className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-foreground transition-opacity"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
        {keys.map((key, index) => {
          const value = object[key];
          const isExpandable =
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.keys(value as Record<string, unknown>).length > 0;
          const isArrayExpandable = Array.isArray(value) && value.length > 0;
          const shouldShowExpander = (isExpandable || isArrayExpandable) && currentDepth < maxDepth;
          const isExpanded = expandedKeys.has(key);
          const shouldAutoExpand = false; // 默认不展开任何层

          return (
            <div key={key} className="py-1">
              <div className="flex items-start gap-2 min-w-0">
                {shouldShowExpander ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKey(key)}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded || shouldAutoExpand ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                ) : (
                  <div className="w-5" />
                )}
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  &quot;{key}&quot;
                </span>
                <span className="text-gray-600 dark:text-gray-400">:</span>
                {(!shouldShowExpander || (!isExpanded && !shouldAutoExpand)) && (
                  <div className="flex-1 inline-flex items-start min-w-0">
                    {isExpandable ? (
                      <span className="text-gray-500 italic">{'{ ... }'}</span>
                    ) : isArrayExpandable ? (
                      <span className="text-gray-500 italic">
                        [{(value as unknown[]).length} items]
                      </span>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <CollapsibleJsonViewer
                          data={value}
                          currentDepth={currentDepth + 1}
                          maxDepth={maxDepth}
                        />
                      </div>
                    )}
                    {index < keys.length - 1 && (
                      <span className="text-gray-600 dark:text-gray-400">,</span>
                    )}
                  </div>
                )}
              </div>
              {shouldShowExpander && (isExpanded || shouldAutoExpand) && (
                <div className="ml-5 mt-1">
                  <CollapsibleJsonViewer
                    data={value}
                    currentDepth={currentDepth + 1}
                    maxDepth={maxDepth}
                  />
                  {index < keys.length - 1 && (
                    <span className="text-gray-600 dark:text-gray-400">,</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-gray-600 dark:text-gray-400">{'}'}</span>
    </div>
  );
};

const ArrayViewer: React.FC<{
  array: unknown[];
  currentDepth: number;
  maxDepth: number;
}> = ({ array, currentDepth, maxDepth }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const copyArray = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(array, null, 2));
      toast({
        title: t('components.collapsibleJsonViewer.copied'),
        description: t('components.collapsibleJsonViewer.arrayCopied'),
      });
    } catch (error) {
      toast({
        title: t('components.collapsibleJsonViewer.copyFailed'),
        description: t('components.collapsibleJsonViewer.cannotCopyToClipboard'),
        variant: 'destructive',
      });
    }
  };

  if (array.length === 0) {
    return <span className="text-gray-500">[]</span>;
  }

  return (
    <div className="group">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
        <span className="text-gray-600 dark:text-gray-400">[</span>
        {!isExpanded && (
          <span className="text-gray-500 italic">
            {array.length} {t('components.collapsibleJsonViewer.items')}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={copyArray}
          className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-foreground transition-opacity"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      {isExpanded && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
          {array.map((item, index) => (
            <div key={index} className="py-1">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 text-xs">{index}:</span>
                <div className="flex-1 inline-flex items-start">
                  <CollapsibleJsonViewer
                    data={item}
                    currentDepth={currentDepth + 1}
                    maxDepth={maxDepth}
                  />
                  {index < array.length - 1 && (
                    <span className="text-gray-600 dark:text-gray-400">,</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <span className="text-gray-600 dark:text-gray-400">]</span>
    </div>
  );
};

export default CollapsibleJsonViewer;
