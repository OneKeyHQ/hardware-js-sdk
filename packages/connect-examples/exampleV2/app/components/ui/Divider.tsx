import React from 'react';
import { cn } from '../../utils/utils';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  decorative?: boolean;
  withLabel?: boolean;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className,
  decorative = false,
  withLabel = false,
  label,
}) => {
  if (withLabel && label) {
    return (
      <div className={cn('relative flex items-center py-4', className)}>
        <div className="flex-grow onekey-divider h-px" />
        <div className="mx-4 text-xs font-medium text-muted-foreground bg-background px-2">
          {label}
        </div>
        <div className="flex-grow onekey-divider h-px" />
      </div>
    );
  }

  return (
    <div
      role={decorative ? 'presentation' : 'separator'}
      aria-orientation={orientation}
      className={cn(
        'onekey-divider',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
    />
  );
};

export default Divider;
