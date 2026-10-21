/**
 * Isotipo de la tienda (public/logo.png, fondo transparente). Los íconos del navegador salen
 * de los mismos trazos: src/app/icon.png, apple-icon.png y favicon.ico.
 */
export const LOGO = { src: '/logo.png', width: 512, height: 440 } as const

/** Ancho para mostrar el logo a una altura dada sin deformarlo. */
export const logoWidth = (height: number) => Math.round((height * LOGO.width) / LOGO.height)
