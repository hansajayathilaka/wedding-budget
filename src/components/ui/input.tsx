import * as React from 'react';
import { cn } from '@/lib/utils';

const fieldClass =
  'w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(fieldClass, 'h-10', className)} ref={ref} {...props} />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea className={cn(fieldClass, 'min-h-20 py-2', className)} ref={ref} {...props} />
));
Textarea.displayName = 'Textarea';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select className={cn(fieldClass, 'h-10', className)} ref={ref} {...props} />
  ),
);
Select.displayName = 'Select';

export { Input, Textarea, Select };
