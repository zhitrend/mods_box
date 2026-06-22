import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-transparent bg-primary text-primary-foreground shadow': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-transparent bg-destructive text-destructive-foreground shadow': variant === 'destructive',
          'text-foreground': variant === 'outline',
          'border-transparent bg-green-500/10 text-green-600 dark:text-green-400': variant === 'success',
          'border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
