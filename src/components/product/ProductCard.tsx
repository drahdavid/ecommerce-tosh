import Image from 'next/image'
import Link from 'next/link'
import type { ProductCardData } from '@/lib/data/catalog'
import { PriceTag } from './Price'

export const ProductCard = ({ product, priority }: { product: ProductCardData; priority?: boolean }) => (
  <Link
    href={`/productos/${product.slug}`}
    className="group flex flex-col gap-3 rounded-[22px] bg-white p-2 pb-4 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
  >
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-50">
      {product.image?.url ? (
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
      ) : null}
      {!product.inStock ? (
        <span className="absolute top-2 left-2 rounded-full bg-zinc-900/85 px-2.5 py-1 text-xs font-bold text-white">Sin stock</span>
      ) : product.price?.compareAtCents ? (
        <span className="absolute top-2 left-2 rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold text-zinc-900">
          -{Math.round((1 - product.price.priceCents / product.price.compareAtCents) * 100)}%
        </span>
      ) : null}
    </div>
    <div className="space-y-1.5 px-2">
      <h3 className="line-clamp-2 text-[13px] leading-snug text-zinc-700 sm:text-sm">{product.title}</h3>
      <PriceTag price={product.price} fromPrice={product.fromPrice} />
    </div>
  </Link>
)

export const ProductGrid = ({ products, priority = true }: { products: ProductCardData[]; priority?: boolean }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {products.map((p, i) => (
      <ProductCard key={p.id} product={p} priority={priority && i < 5} />
    ))}
  </div>
)
