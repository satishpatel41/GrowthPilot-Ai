import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700',
        outline: 'border border-gray-300 bg-white text-ink hover:bg-gray-50',
        danger: 'border border-gray-300 bg-white text-red-700 hover:bg-red-50',
        ghost: 'text-ink hover:bg-gray-100',
      },
      size: { md: 'h-11 px-5', sm: 'h-9 px-3.5' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
export const buttonClass = (v: VariantProps<typeof button> = {}) => button(v);
