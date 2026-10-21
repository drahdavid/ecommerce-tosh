import type { TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

/**
 * Validación por patrón para campos de texto opcionales. Un `validate` propio reemplaza al de
 * Payload, así que se lo sigue llamando (requerido, largo).
 */
export const matches =
  (pattern: RegExp, message: string): TextFieldSingleValidation =>
  (value, options) =>
    value && !pattern.test(value) ? message : text(value, options)

/** Links que se muestran al público o en emails: solo http(s), nunca `javascript:` ni `data:`. */
export const httpUrl = matches(/^https?:\/\/\S+$/i, 'Tiene que ser un link completo, que empiece con https://')
