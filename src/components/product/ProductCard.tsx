import Image from 'next/image'
import Link from 'next/link'
import type { ProductCardData } from '@/lib/data/catalog'
import { PriceTag } from './Price'

export const ProductCard = ({ product, priority }: { product: ProductCardData; priority?: boolean }) => (
  <Link href={`/productos/${product.slug}`} className="group flex flex-col gap-3">
    <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
      {product.image?.url ? (
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
        />
      ) : null}
      {!product.inStock ? (
        <span className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1 text-xs font-medium">Sin stock</span>
      ) : product.price?.compareAtCents ? (
        <span className="absolute top-2 left-2 rounded bg-accent px-2 py-1 text-xs font-semibold text-white">
          {Math.round((1 - product.price.priceCents / product.price.compareAtCents) * 100)}% OFF
        </span>
      ) : null}
    </div>
    <div className="space-y-1">
      <h3 className="line-clamp-2 text-sm text-zinc-800">{product.title}</h3>
      <PriceTag price={product.price} fromPrice={product.fromPrice} />
    </div>
  </Link>
)

export const ProductGrid = ({ products }: { products: ProductCardData[] }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
    {products.map((p, i) => (
      <ProductCard key={p.id} product={p} priority={i < 4} />
    ))}
  </div>
)
