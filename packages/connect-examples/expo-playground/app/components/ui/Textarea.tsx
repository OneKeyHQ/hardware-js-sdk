import * as React from 'react';
/* shadcn/ui style Textarea */

import { cn } from '../../utils/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono',
          'resize-none',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };

