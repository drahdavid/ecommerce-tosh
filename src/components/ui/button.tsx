import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-zinc-900 text-white hover:bg-zinc-700',
        outline: 'border border-zinc-300 bg-white hover:bg-zinc-50',
        ghost: 'hover:bg-zinc-100',
        link: 'underline underline-offset-4 hover:text-zinc-600',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-5',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
)
