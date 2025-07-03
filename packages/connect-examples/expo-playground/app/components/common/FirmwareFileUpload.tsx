import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription } from '../ui/Alert';
import { cn } from '../../utils/utils';

interface FirmwareFileUploadProps {
  title: string;
  description: string;
  acceptedFormats: string;
  maxSize?: number; // in bytes
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

const FirmwareFileUpload: React.FC<FirmwareFileUploadProps> = ({
  title,
  description,
  acceptedFormats,
  maxSize = 50 * 1024 * 1024, // 50MB default
  selectedFile,
  onFileSelect,
  className,
  disabled = false,
  required = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 验证文件
  const validateFile = useCallback(
    (file: File): string | null => {
      // 检查文件大小
      if (file.size > maxSize) {
        return `${t('components.firmwareFileUpload.fileSizeTooLarge')} (${formatFileSize(
          maxSize
        )})`;
      }

      // 检查文件格式
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const acceptedExtensions = acceptedFormats.split(',').map(ext => ext.trim().toLowerCase());

      if (!acceptedExtensions.includes(fileExtension)) {
        return `${t('components.firmwareFileUpload.unsupportedFormat')}: ${acceptedFormats}`;
      }

      return null;
    },
    [maxSize, acceptedFormats, t]
  );

  // 处理文件选择
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  // 处理文件输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 处理拖拽
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 移除文件
  const handleRemoveFile = () => {
    setError(null);
    onFileSelect(null);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {title}
            {required && <span className="text-orange-600">*</span>}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {acceptedFormats}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 文件上传区域 */}
        {!selectedFile && (
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={acceptedFormats}
              onChange={handleInputChange}
              disabled={disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t('components.firmwareFileUpload.clickToSelect')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('components.firmwareFileUpload.supportedFormats')}: {acceptedFormats} |{' '}
                  {t('components.firmwareFileUpload.maxSize')}: {formatFileSize(maxSize)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 已选择的文件 */}
        {selectedFile && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <File className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 帮助信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{t('components.firmwareFileUpload.helpInfo.line1')}</p>
          <p>{t('components.firmwareFileUpload.helpInfo.line2')}</p>
          <p>{t('components.firmwareFileUpload.helpInfo.line3')}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FirmwareFileUpload;
