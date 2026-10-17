'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copiar"
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => null)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-zinc-500 hover:text-zinc-900"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
