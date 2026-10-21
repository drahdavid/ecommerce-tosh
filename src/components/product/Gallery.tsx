'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type GalleryImage = { url: string; thumb: string; alt: string }

export const Gallery = ({ images, activeUrl }: { images: GalleryImage[]; activeUrl?: string | null }) => {
  const [index, setIndex] = useState(0)
  const forced = activeUrl ? images.findIndex((i) => i.url === activeUrl || i.thumb === activeUrl) : -1
  const current = images[forced >= 0 ? forced : index] ?? images[0]

  if (!current) return <div className="aspect-square rounded-[28px] bg-white" />

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-[28px] bg-white">
        <Image src={current.url} alt={current.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setIndex(i)}
              className={cn(
                'relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition',
                img === current ? 'border-zinc-900' : 'border-transparent hover:border-zinc-300',
              )}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image src={img.thumb} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
