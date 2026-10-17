import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const control =
  'w-full rounded-md border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none aria-invalid:border-red-500'

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, 'h-11', className)} {...props} />
)

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(control, 'h-11', className)} {...props} />
)

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(control, 'min-h-24 py-2', className)} {...props} />
)

export const Field = (props: { label: string; htmlFor: string; error?: string; hint?: string; className?: string; children: ReactNode }) => (
  <div className={cn('flex flex-col gap-1.5', props.className)}>
    <label htmlFor={props.htmlFor} className="text-sm font-medium text-zinc-800">
      {props.label}
    </label>
    {props.children}
    {props.error ? (
      <p className="text-xs text-red-600" role="alert">
        {props.error}
      </p>
    ) : props.hint ? (
      <p className="text-xs text-zinc-500">{props.hint}</p>
    ) : null}
  </div>
)
