import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium leading-tight',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-surface-sunken)] text-[var(--color-text-soft)]',
        accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
        outline: 'border border-[var(--color-border-strong)] text-[var(--color-muted)]',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
        danger: 'bg-red-50 text-red-700',
        info: 'bg-blue-50 text-blue-700',
        neutral: 'bg-slate-100 text-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
